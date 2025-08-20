# WTFY - "Was This Fixed Yet?" Production Dockerfile

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

# Set as environment variables for build process
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
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

# Build the application
RUN pnpm run build

# Production stage
FROM node:22-alpine AS production

# Install curl for health checks and pnpm
RUN apk add --no-cache curl
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

# Copy schema file needed for drizzle-kit migrations
COPY --from=base /app/src/lib/server/db/schema.ts ./src/lib/server/db/schema.ts

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs  
RUN adduser -S sveltekit -u 1001 -G nodejs

# Change ownership of the app directory
RUN chown -R sveltekit:nodejs /app

# Switch to non-root user
USER sveltekit

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/_health || exit 1

# Environment variables with defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV MAX_REQUESTS_PER_HOUR=100
ENV CACHE_TTL_HOURS=24

# Start the application
CMD ["pnpm", "start"]
