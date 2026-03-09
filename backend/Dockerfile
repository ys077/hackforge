# Node.js Backend Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev && npm cache clean --force

# Build stage
FROM base AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Production image
FROM base AS runner
WORKDIR /app

# Set environment
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs

# Install wget for health check
RUN apk add --no-cache wget

# Copy built application
COPY --from=deps --chown=expressjs:nodejs /app/node_modules ./node_modules
COPY --chown=expressjs:nodejs . .

# Create uploads and logs directories
RUN mkdir -p uploads logs && chown -R expressjs:nodejs uploads logs

USER expressjs

# Expose port
EXPOSE 3000

# Health check - uses PORT env variable (defaults to 3000)
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:${PORT:-3000}/health || exit 1

# Start the application
CMD ["node", "src/server.js"]
