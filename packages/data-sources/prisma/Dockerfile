# Stage 1: Build dependencies and generate Prisma client
FROM node:24-alpine AS builder

WORKDIR /app

RUN echo "🚀 Starting build of Prisma Data Sources Dockerfile..."

# Copy monorepo package files
RUN echo "🔧 Stage 1: Setting up builder environment..."
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY packages/data-sources/prisma/package.json ./packages/data-sources/prisma/

# Install pnpm and dependencies
RUN echo "📦 Enabling corepack and installing dependencies..."
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate && pnpm install --frozen-lockfile

# Copy package source files
RUN echo "📁 Copying Prisma package source files..."
COPY packages/data-sources/prisma/tsconfig.json ./packages/data-sources/prisma/
COPY packages/data-sources/prisma/tsconfig.seed.json ./packages/data-sources/prisma/
COPY packages/data-sources/prisma/index.ts ./packages/data-sources/prisma/
COPY packages/data-sources/prisma/schema.prisma ./packages/data-sources/prisma/
COPY packages/data-sources/prisma/migrations ./packages/data-sources/prisma/migrations
COPY packages/data-sources/prisma/seed.ts ./packages/data-sources/prisma/

# Copy shared workspace configs needed for build
RUN echo "⚙️ Copying workspace configuration files..."
COPY tsconfig.base.json ./
COPY nx.json ./
COPY prisma.config.ts ./
COPY packages/data-sources/prisma/project.json ./packages/data-sources/prisma/

# Disable Nx daemon for Docker builds
ENV NX_DAEMON=false

# Generate Prisma client and build the package (this will output to dist/packages/data-sources/prisma/)
RUN echo "🏗️ Generate Prisma client and build Prisma package with Nx..."
RUN pnpm nx build prisma

# Stage 2: Runtime image for migrations
FROM node:24-alpine

WORKDIR /app

RUN echo "🔧 Stage 2: Setting up runtime environment..."
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

# Copy workspace root files needed for Prisma CLI and seeding
RUN echo "📦 Copying dependencies from builder stage..."
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/tsconfig.base.json ./
COPY --from=builder /app/prisma.config.ts ./

# Copy Prisma package files needed for migrations and seeding
COPY --from=builder /app/packages/data-sources/prisma/index.ts ./packages/data-sources/prisma/index.ts
COPY --from=builder /app/packages/data-sources/prisma/seed.ts ./packages/data-sources/prisma/seed.ts
COPY --from=builder /app/packages/data-sources/prisma/schema.prisma ./packages/data-sources/prisma/schema.prisma
COPY --from=builder /app/packages/data-sources/prisma/tsconfig.json ./packages/data-sources/prisma/tsconfig.json
COPY --from=builder /app/packages/data-sources/prisma/tsconfig.seed.json ./packages/data-sources/prisma/tsconfig.seed.json
COPY --from=builder /app/packages/data-sources/prisma/migrations ./packages/data-sources/prisma/migrations
COPY --from=builder /app/packages/data-sources/prisma/generated ./packages/data-sources/prisma/generated

RUN echo "✅ Prisma Docker image build complete!"

# Default to safe command. Essentially a no-op, but is helpful for verifying that the image was built correctly.
# Can use Docker Desktop to verify results in the log. Override in compose to perform migrations etc.
CMD ["npx", "prisma", "validate"]
