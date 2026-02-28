# Multi-stage build for NestJS API (Nx/pnpm monorepo best practice)

ARG BUILD_CONFIG=production

FROM node:24 AS base

WORKDIR /app

RUN echo "🚀 Starting build of NestJS API Dockerfile..."

# Install dependencies only when needed
FROM base AS deps
RUN echo "🔧 Stage 1: Setting up dependencies environment..."
# Copy dependency management files first for better caching
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY nx.json ./
# Copy app and workspace package.json files (minimal metadata only now)
COPY apps/api/package.json apps/api/package.json
COPY packages/utils/package.json packages/utils/package.json

# Install pnpm and dependencies (need all deps for build)
ENV CYPRESS_INSTALL_BINARY=0
RUN echo "📦 Enabling corepack and installing dependencies..."
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    corepack enable && corepack prepare pnpm@10.30.3 --activate && \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile

# Generate Prisma client and build the application
FROM deps AS builder
ARG BUILD_CONFIG
RUN echo "🏗️ Stage 2: Building API application..."
# Copy only necessary files for API build, excluding Nuxt apps
COPY apps/api/ ./apps/api/
COPY packages/data-sources/prisma/ ./packages/data-sources/prisma/
COPY packages/utils/ ./packages/utils/
COPY tsconfig.base.json ./
COPY prisma.config.ts ./
COPY vitest.workspace.ts ./

# Disable Nx daemon for Docker builds
ENV NX_DAEMON=false

# Build with proper configuration (which includes Prisma client generation)
RUN echo "🚀 Building API with Nx (${BUILD_CONFIG} config)..."
RUN pnpm nx run api:build:${BUILD_CONFIG}

# Production image, copy only necessary files
FROM base AS runner
WORKDIR /app
RUN echo "🔧 Stage 3: Setting up production runtime..."

# Enable corepack and pnpm in runtime image for prod deps install
RUN echo "📦 Enabling corepack in runtime image..."
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

# Copy the optimized package.json with only required dependencies
COPY --from=builder /app/dist/apps/api/package.json ./package.json

# Install only production dependencies based on the generated package.json
RUN echo "📦 Installing production dependencies..."
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --prod --no-frozen-lockfile

# Install @prisma/client runtime (required by generated Prisma client but not auto-detected by Nx)
# The schema-specific generated client imports from @prisma/client/runtime/client at runtime
# Using pnpm add ensures all transitive dependencies (like client-runtime-utils) are installed
# Reading version from builder's package.json ensures sync with pnpm-lock.yaml
RUN echo "📦 Installing @prisma/client runtime..."
COPY --from=builder /app/package.json /tmp/root-package.json
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    PRISMA_VERSION=$(node -e "console.log(require('/tmp/root-package.json').dependencies['@prisma/client'].replace('^', ''))") && \
    pnpm add @prisma/client@$PRISMA_VERSION --prod && \
    rm /tmp/root-package.json

# Copy the schema-specific generated Prisma client (models, types, and PrismaClient class for our schema)
# This is the compiled output from `prisma generate` that uses the runtime library above
RUN echo "🔌 Copying schema-specific Prisma client..."
COPY --from=builder /app/dist/packages/data-sources/prisma/generated ./dist/packages/data-sources/prisma/generated

# Copy built application
RUN echo "📋 Copying built application files..."
COPY --from=builder /app/dist/apps/api ./dist/apps/api

# Change ownership to node user for write permissions
RUN echo "👤 Setting up node user permissions..."
RUN chown -R node:node /app

USER node

# Optionally bake a default API port into image metadata for local Compose builds.
# Cloud providers ignore EXPOSE and rely on runtime env or service config.
ARG API_PORT
EXPOSE ${API_PORT}

RUN echo "✅ NestJS API Docker image build complete!"

CMD ["node", "dist/apps/api/main.js"]
