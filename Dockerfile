# WTFY - "Was This Fixed Yet?" Production Dockerfile with embedded PostgreSQL

# Use official Node.js LTS image
FROM node:22-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Accept build arguments for environment variables needed during build
ARG GITHUB_TOKEN
ARG OPENAI_API_KEY
ARG GITHUB_CLIENT_ID
ARG GITHUB_CLIENT_SECRET
ARG JWT_SECRET

# Set as environment variables for build process (local PostgreSQL)
ENV DATABASE_URL="postgresql://wtfy:wtfy_password@localhost:5432/wtfy"
ENV GITHUB_TOKEN=$GITHUB_TOKEN
ENV OPENAI_API_KEY=$OPENAI_API_KEY
ENV GITHUB_CLIENT_ID=$GITHUB_CLIENT_ID
ENV GITHUB_CLIENT_SECRET=$GITHUB_CLIENT_SECRET
ENV JWT_SECRET=$JWT_SECRET

# Copy package files and Sentry tarball
COPY package.json pnpm-lock.yaml sentry-sveltekit-10.5.0.tgz ./

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# Copy source code
COPY . .

# Build the application (now has access to env vars)
RUN pnpm run build

# Production stage with PostgreSQL
FROM node:22-alpine AS production

# Install PostgreSQL, pnpm, and other dependencies
RUN apk add --no-cache \
    postgresql \
    postgresql-contrib \
    postgresql-dev \
    curl \
    su-exec

# Install pnpm globally
RUN npm install -g pnpm

# Create app directory
WORKDIR /app

# Copy package files and Sentry tarball for production dependencies
COPY package.json pnpm-lock.yaml sentry-sveltekit-10.5.0.tgz ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built application from previous stage
COPY --from=base /app/build ./build
COPY --from=base /app/drizzle ./drizzle
COPY --from=base /app/drizzle.config.ts ./

# Copy startup script
COPY scripts/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# Create PostgreSQL data directory
RUN mkdir -p /var/lib/postgresql/data
RUN mkdir -p /run/postgresql

# Create users and groups
RUN addgroup -g 999 -S postgres
RUN adduser -S postgres -u 999 -G postgres
RUN addgroup -g 1001 -S nodejs  
RUN adduser -S sveltekit -u 1001 -G nodejs

# Set up PostgreSQL directories and permissions
RUN chown -R postgres:postgres /var/lib/postgresql
RUN chown -R postgres:postgres /run/postgresql
RUN chmod 750 /var/lib/postgresql/data

# Change ownership of the app directory
RUN chown -R sveltekit:nodejs /app

# Create volume for PostgreSQL data persistence
VOLUME ["/var/lib/postgresql/data"]

# Expose port
EXPOSE 3000

# Health check (wait longer for PostgreSQL to start)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/_health || exit 1

# Environment variables with defaults (using embedded PostgreSQL)
ENV NODE_ENV=production
ENV PORT=3000
ENV ORIGIN=http://localhost:3000
ENV DATABASE_URL="postgresql://wtfy:wtfy_password@localhost:5432/wtfy"
ENV MAX_REQUESTS_PER_HOUR=100
ENV CACHE_TTL_HOURS=24

# Start PostgreSQL and the application
CMD ["/usr/local/bin/start.sh"]
