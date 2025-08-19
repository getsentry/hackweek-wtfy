# WTFY - "Was This Fixed Yet?" Production Dockerfile

# Use official Node.js LTS image
FROM node:22-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

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

# Install curl for health check
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S sveltekit -u 1001

# Change ownership of the app directory
RUN chown -R sveltekit:nodejs /app
USER sveltekit

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/_health || exit 1

# Environment variables with defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV ORIGIN=http://localhost:3000
ENV MAX_REQUESTS_PER_HOUR=100
ENV CACHE_TTL_HOURS=24

# Start the application
CMD ["pnpm", "start"]
