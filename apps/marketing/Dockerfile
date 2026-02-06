# Multi-stage build for Nuxt Marketing (Nx/pnpm monorepo best practice)

FROM node:24 AS base

WORKDIR /app

RUN echo "🚀 Starting build of Nuxt Marketing Dockerfile..."

# Install dependencies only when needed
FROM base AS deps
RUN echo "🔧 Stage 1: Setting up dependencies environment..."
# Copy dependency management files first for better caching
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY nx.json ./
# Copy app package.json (minimal metadata only now)
COPY apps/marketing/package.json apps/marketing/package.json

# Install pnpm and dependencies
RUN echo "📦 Enabling corepack and installing dependencies..."
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate && pnpm install --frozen-lockfile

# Build the application
FROM deps AS builder
RUN echo "🏗️ Stage 2: Building marketing application..."

# Copy only necessary files for marketing build, excluding other apps
COPY apps/marketing/ ./apps/marketing/
COPY tsconfig.base.json ./
COPY eslint.config.mjs ./

# Disable Nx daemon for Docker builds
ENV NX_DAEMON=false

# Build the marketing site with proper configuration
RUN echo "🚀 Building marketing site with Nx..."
RUN pnpm nx run marketing:build

# Production image, copy only necessary files
FROM node:24-alpine AS runner
WORKDIR /app
RUN echo "🔧 Stage 3: Setting up production runtime..."

# Copy built output (Nuxt's .output is self-contained)
RUN echo "📋 Copying built marketing files..."
COPY --from=builder /app/dist/apps/marketing/ ./dist/apps/marketing/

# Create non-root user
RUN echo "👤 Creating non-root user..."
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nuxt

# Change ownership
RUN echo "🔐 Setting file permissions..."
RUN chown -R nuxt:nodejs /app
USER nuxt

# Optionally bake a default marketing port into image metadata for local Compose builds.
# Cloud providers ignore EXPOSE and rely on runtime env or service config.
ARG MARKETING_PORT
ENV PORT=${MARKETING_PORT}
EXPOSE ${MARKETING_PORT}

RUN echo "✅ Nuxt Marketing Docker image build complete!"

CMD ["node", "dist/apps/marketing/server/index.mjs"]
