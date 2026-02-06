# Multi-stage build for Nuxt Webapp (Nx/pnpm monorepo best practice)

FROM node:24 AS base

WORKDIR /app

RUN echo "🚀 Starting build of Nuxt Webapp Dockerfile..."

# Install dependencies only when needed
FROM base AS deps
RUN echo "🔧 Stage 1: Setting up dependencies environment..."
# Copy dependency management files first for better caching
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY nx.json ./
# Copy app package.json (minimal metadata only now)
COPY apps/webapp/package.json apps/webapp/package.json

# Install pnpm and dependencies
RUN echo "📦 Enabling corepack and installing dependencies..."
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate && pnpm install --frozen-lockfile

# Build the application
FROM deps AS builder
RUN echo "🏗️ Stage 2: Building webapp application..."

# Copy only necessary files for webapp build, excluding other apps
COPY apps/webapp/ ./apps/webapp/
COPY packages/ ./packages/
COPY tsconfig.base.json ./
COPY eslint.config.mjs ./

# Disable Nx daemon for Docker builds
ENV NX_DAEMON=false

# Build the webapp with proper configuration
RUN echo "🚀 Building webapp with Nx..."
RUN pnpm nx run webapp:build

# Production image, copy only necessary files
FROM node:24-alpine AS runner
WORKDIR /app
RUN echo "🔧 Stage 3: Setting up production runtime..."

# Copy built output (Nuxt's .output is self-contained)
RUN echo "📋 Copying built webapp files..."
COPY --from=builder /app/dist/apps/webapp/ ./dist/apps/webapp/

# Create non-root user
RUN echo "👤 Creating non-root user..."
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nuxt

# Change ownership
RUN echo "🔐 Setting file permissions..."
RUN chown -R nuxt:nodejs /app
USER nuxt

# Optionally bake a default webapp port into image metadata for local Compose builds.
# Cloud providers ignore EXPOSE and rely on runtime env or service config.
ARG WEBAPP_PORT
ENV PORT=${WEBAPP_PORT}
EXPOSE ${WEBAPP_PORT}

RUN echo "✅ Nuxt Webapp Docker image build complete!"

CMD ["node", "dist/apps/webapp/server/index.mjs"]
