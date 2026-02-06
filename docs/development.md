# Development Guide

Comprehensive guide for setting up your development environment, understanding the architecture, and working efficiently with this monorepo.

## IDE Setup

This project includes pre-configured settings for VS Code and Cursor to provide an optimal development experience.

### Recommended Extensions

When you first open the project, your IDE will prompt you to install recommended extensions:

### Recommended Extensions

When you first open the project, your IDE will prompt you to install recommended extensions:

- **Prettier** — Code formatter for consistent styling
- **ESLint** — JavaScript/TypeScript linting and error detection
- **Tailwind CSS IntelliSense** — Autocomplete and syntax highlighting for Tailwind
- **Vue Language Features (Volar)** — Vue 3 and Nuxt 4 support
- **Prisma** — Database schema editing and introspection

### Automatic Formatting

The project is configured to format and lint code automatically on save:

### Automatic Formatting

The project is configured to format and lint code automatically on save:

- **Prettier** formats code automatically according to project style rules
- **ESLint** fixes auto-fixable issues on save
- **Import statements** are organized automatically

### Manual Commands

Available via Command Palette (`Cmd/Ctrl + Shift + P`):

- **Format Document** — Manually format the current file
- **ESLint: Fix all auto-fixable Problems** — Fix all linting issues in current file

## Environment Setup

Follow these steps to set up your local development environment:

### 1. Install Dependencies

```bash
pnpm install
```

This installs all dependencies across the monorepo using pnpm workspaces.

### 2. Run Development Setup

Configure Git hooks and install necessary binaries:

```bash
pnpm dev-setup
```

This command:

- Installs Husky Git hooks for pre-commit and pre-push checks
- Installs the Cypress binary for E2E testing
- Sets appropriate permissions for hook scripts

### 3. Build All Applications

```bash
pnpm build
```

This builds all applications and packages in the correct dependency order.

### 4. Configure Environment Variables

```bash
cp .env.example .env
```

This provides basic variables for local development. For advanced configurations including secrets management with Infisical, see the [env-run README](../packages/env-run/README.md).

### 5. Start Database

```bash
pnpm db:up
```

This starts a PostgreSQL 18 container via Docker Compose.

### 6. Run Database Migrations

```bash
pnpm db:migrate
```

This applies all pending Prisma migrations to your local database.

### 7. Seed Database (Optional)

```bash
pnpm db:seed
```

This populates your database with sample data for development and testing.

## Development Workflow

### Starting Development Servers

Start all applications concurrently:

```bash
pnpm start
```

This starts the API, webapp, and marketing site simultaneously with hot module reloading enabled.

#### Individual Applications

For focused development, start applications individually:

```bash
pnpm api:start       # NestJS API on port 3001
pnpm webapp:start    # Nuxt webapp on port 3000
pnpm marketing:start # Nuxt marketing site on port 3002
```

### Making Changes

1. **Edit code** in your preferred editor with automatic formatting and linting
2. **View changes** immediately via hot module reloading
3. **Write tests** following TDD principles (see [Testing Guide](testing.md))
4. **Run tests** to ensure quality and coverage requirements

### Running Tests

```bash
pnpm test-unit          # Fast unit tests without coverage
pnpm test-coverage      # Unit tests with 100% coverage enforcement
pnpm test-e2e           # End-to-end integration tests
```

For comprehensive testing guidance, see the [Testing Guide](testing.md).

### Committing Changes

Git hooks run automatically on commit and push:

- **Pre-commit** — Runs lint-staged to check only staged files
- **Pre-push** — Runs full quality checks (format, lint, typespec, build, tests)

To run all checks manually before committing:

```bash
pnpm all-check
```

## Docker Development

For development using Docker containers instead of running services locally:

### Start All Services

```bash
pnpm docker:up
```

This starts all applications and the database in Docker containers with hot reloading enabled.

### Stop Services

```bash
pnpm docker:down
```

This stops and removes all containers, but preserves database volumes.

### View Logs

Monitor logs for individual services:

```bash
docker compose -f infra/compose.local.yml logs -f api
docker compose -f infra/compose.local.yml logs -f webapp
docker compose -f infra/compose.local.yml logs -f marketing
```

### Container Networking

The Docker configuration handles service connectivity automatically. The API service connects to the database using the service name `db` instead of `localhost`, which is resolved via Docker's internal DNS.

## Application Architecture

### Backend (NestJS)

The API is built with NestJS using the Fastify adapter for superior performance compared to Express.

#### Key Features

- **Fastify adapter** — High-performance HTTP server with lower overhead
- **Prisma ORM** — Type-safe database access with automated migrations
- **Swagger documentation** — Interactive API docs at `/api/docs`
- **Environment-based configuration** — 12-factor app principles via `env-run`
- **Comprehensive error handling** — Structured error responses with proper HTTP status codes
- **Health checks** — Ready for production monitoring and orchestration

#### Project Structure

```
apps/api/
├── src/
│   ├── app/
│   │   ├── config/              # Configuration module and schemas
│   │   ├── health/              # Health check endpoints
│   │   ├── hello-world/         # Example feature module
│   │   ├── app.module.ts        # Root application module
│   │   ├── app.controller.ts    # Root controller
│   │   └── app.service.ts       # Root service
│   ├── prisma.service.ts        # Prisma database service
│   └── main.ts                  # Application entry point and bootstrap
├── tests/                       # All test files
│   ├── e2e/                     # End-to-end integration tests
│   ├── helpers/                 # Test utilities and helpers
│   └── unit/                    # Unit tests (mirrors src/ structure)
└── Dockerfile                   # Multi-stage container build
```

#### Module Organization

Each feature follows a consistent module pattern:

- **Controller** — HTTP routing and request/response handling
- **Service** — Business logic and data orchestration
- **Module** — Dependency injection container for the feature

This separation ensures testability and maintainability.

### Frontend (Nuxt 4)

Two Nuxt 4 applications serve different purposes:

- **webapp** — Main single-page application (SPA) with client-side routing
- **marketing** — Marketing site with static generation for optimal SEO

#### Key Features

- **Nuxt 4** — Latest version with improved performance and DX
- **Tailwind CSS v4** — Using the new `@import "tailwindcss"` syntax with Vite plugin
- **Nuxt UI** — Pre-built accessible components
- **TypeScript** — Full type safety across components and composables
- **API proxy** — Seamless backend integration via server middleware
- **SEO optimization** — Meta tags, structured data, and performance tuning

#### Project Structure

```
apps/webapp/ (or marketing/)
├── pages/                    # File-based routing (auto-generated routes)
├── components/               # Vue 3 components with <script setup>
├── composables/              # Reusable composition functions
├── assets/
│   └── css/
│       └── tailwind.css      # Tailwind v4 styles (@import syntax)
├── server/
│   └── middleware/           # Server-side middleware (e.g., API proxy)
├── tests/
│   ├── e2e/                  # Cypress E2E tests
│   └── unit/                 # Vitest unit tests
├── nuxt.config.ts            # Nuxt configuration
├── app.vue                   # Root component
└── Dockerfile                # Multi-stage container build
```

#### Tailwind CSS v4

This project uses Tailwind CSS v4's new CSS-first configuration approach. The `tailwind.css` file uses `@import "tailwindcss"` instead of the legacy `@tailwind` directives:

```css
@import "tailwindcss";

/* Your custom styles here */
```

The Tailwind Vite plugin handles the rest automatically.

## Database Management

### Prisma Schema

The database is managed with Prisma ORM. The schema is located at:

```
packages/data-sources/prisma/schema.prisma
```

#### Example Model

```prisma
model HelloWorldMessage {
  id        String   @id @default(cuid())
  message   String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("hello_world_messages")
}
```

### Database Commands

Common database operations:

```bash
pnpm db:up              # Start PostgreSQL 18 container
pnpm db:down            # Stop PostgreSQL container
pnpm db:migrate         # Apply pending migrations
pnpm db:reset           # Reset database (drops all data and reapplies migrations)
pnpm db:seed            # Seed database with sample data
pnpm db:studio          # Open Prisma Studio (GUI for browsing/editing data)
pnpm db:test:studio     # Open Prisma Studio for E2E test database
```

### Creating Migrations

After modifying the Prisma schema:

```bash
# Generate and apply migration in development
nx run prisma:db:migrate-dev --args="--name=add_user_table"

# Or use the Nx target directly
nx run prisma:db:migrate-dev
```

### Database Connection

Connection strings are managed via environment variables:

- **Development**: Uses `.env` file with local PostgreSQL container
- **Production**: Uses `env-run` with Infisical for secure secret management

See [env-run README](../packages/env-run/README.md) for details.

## Code Quality

### Linting and Formatting

The project enforces consistent code style through automated tooling:

- **ESLint** — TypeScript and Vue.js linting with flat config format
- **Prettier** — Opinionated code formatting
- **TypeScript** — Strict type checking across the entire stack
- **Git Hooks** — Automatic checks on commit and push via Husky

### Quality Commands

```bash
pnpm lint:check           # Check for linting issues across all projects
pnpm lint:fix             # Auto-fix linting issues
pnpm format:write         # Format all files with Prettier
pnpm format:check         # Verify code formatting (used in CI)
pnpm typespec:validate    # Validate TypeSpec API specifications
pnpm all-check            # Run complete CI check suite locally
```

### Per-Project Commands

Run quality checks for individual projects:

```bash
pnpm api:lint             # Lint API only
pnpm api:lint:fix         # Fix API linting issues
pnpm webapp:lint          # Lint webapp only
pnpm webapp:lint:fix      # Fix webapp linting issues
```

### Git Hooks

Husky manages Git hooks to maintain code quality:

#### Pre-commit Hook

Runs `lint-staged` to check only files staged for commit:

- Formats code with Prettier
- Fixes auto-fixable ESLint issues
- Prevents commits with linting errors

#### Pre-push Hook

Runs comprehensive quality checks before pushing:

1. **Format check** — Verifies all code is properly formatted
2. **Lint check** — Ensures no linting errors exist
3. **TypeSpec validation** — Validates API specifications
4. **Build** — Confirms all projects build successfully
5. **Test coverage** — Enforces 100% unit test coverage

To bypass hooks in exceptional circumstances (not recommended):

```bash
git commit --no-verify
git push --no-verify
```

## Environment Configuration

This project uses the `env-run` utility for flexible, secure environment variable management.

### Features

- **Local `.env` files** — Simple local development without external dependencies
- **Infisical integration** — Centralized secret management for teams and production
- **Environment profiles** — Switch between `dev-docker`, `e2e-docker`, and custom configs
- **Precedence rules** — Clear hierarchy for overriding values

### Basic Usage

For local development, the `.env` file at the root is sufficient:

```bash
cp .env.example .env
# Edit .env with your local values
pnpm start
```

### Advanced Usage

For team environments and production:

```bash
# Use Infisical for development
pnpm env-run --env=dev -- pnpm api:start

# Use custom env profile
pnpm env-run --env=e2e-docker -- pnpm test-e2e
```

For detailed documentation on configuration, precedence rules, and Infisical setup, see the [env-run README](../packages/env-run/README.md).

## Troubleshooting

### Common Issues

#### Database Connection Failed

**Symptoms**: Application can't connect to PostgreSQL

**Solutions**:

1. Ensure Docker is running: `docker ps`
2. Check if database container is up: `docker ps | grep postgres`
3. Verify `DATABASE_URL` in `.env` file matches container configuration
4. Restart database: `pnpm db:down && pnpm db:up`
5. Check logs: `docker logs <container-id>`

#### Port Conflicts

**Symptoms**: Error messages about ports already in use

**Solutions**:

- **Local dev** uses ports 3000 (webapp), 3001 (api), 3002 (marketing)
- **E2E tests** use ports 4000, 4001, 4002 via `env-run --env=e2e-docker`
- Find process using port: `lsof -i :3000` (macOS/Linux) or `netstat -ano | findstr :3000` (Windows)
- Kill process or update `PORT_*` variables in appropriate env file

#### Cypress Binary Not Found

**Symptoms**: E2E tests fail with "Cypress binary not found"

**Solutions**:

1. Run setup: `pnpm dev-setup`
2. Or install manually: `npx cypress install`
3. Verify installation: `npx cypress verify`

#### Test Failures

**Symptoms**: Tests pass locally but fail in CI or vice versa

**Solutions**:

1. Ensure correct environment: Use `--env=e2e-docker` for E2E tests
2. Check if database is in correct state: `pnpm db:reset`
3. Clear test database: `pnpm db:test:studio` and inspect data
4. Verify environment variables are set correctly for the test context

#### Build Failures

**Symptoms**: Build command fails or produces errors

**Solutions**:

1. Clear Nx cache: `npx nx reset`
2. Remove `node_modules` and reinstall: `rm -rf node_modules && pnpm install`
3. Clear TypeScript build cache: `rm -rf dist .next .nuxt`
4. Check for TypeScript errors: `pnpm lint:check`
5. Ensure dependencies are up to date: `pnpm install`

#### Hot Module Reloading Not Working

**Symptoms**: Changes not reflected in browser

**Solutions**:

1. Hard refresh browser: `Cmd/Ctrl + Shift + R`
2. Restart development server
3. Check for console errors in browser dev tools
4. Clear `.nuxt` or `dist` directories and rebuild

#### Prisma Client Out of Sync

**Symptoms**: TypeScript errors about Prisma client types

**Solutions**:

1. Regenerate Prisma Client: `nx run prisma:db:generate`
2. Restart TypeScript server in IDE
3. Run migrations: `pnpm db:migrate`

### Getting Help

If you're still experiencing issues:

1. **Review related documentation**:
   - [Testing Guide](testing.md) — For test-related issues
   - [Deployment Guide](deployment.md) — For Docker and production issues
   - [Conventions](conventions.md) — For code organization questions

2. **Check existing issues** on GitHub for similar problems

3. **Open a new issue** with:
   - Clear description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)
   - Relevant error messages or logs
