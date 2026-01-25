# Development Guide

## IDE Setup

This project includes VS Code/Cursor configuration for optimal development experience:

1. **Install recommended extensions** (will be prompted automatically):
   - Prettier - Code formatter
   - ESLint - JavaScript/TypeScript linting
   - Tailwind CSS IntelliSense
   - Vue Language Features (Volar)
   - Prisma - Database toolkit

2. **Automatic formatting and linting** is configured to run on save:
   - Prettier formats code automatically
   - ESLint fixes issues automatically
   - Import statements are organized automatically

3. **Available commands** (Cmd/Ctrl + Shift + P):
   - `Format Document` - Manually format current file
   - `ESLint: Fix all auto-fixable Problems` - Fix linting issues

## Environment Setup

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Run development setup:**

   This configures Git hooks (Husky) and installs the Cypress binary for E2E testing:

   ```bash
   pnpm dev-setup
   ```

3. **Build all applications:**

   ```bash
   pnpm build
   ```

4. **Copy environment file:**

   ```bash
   cp .env.example .env
   ```

   This provides basic variables for local development. For advanced configurations including secrets management, see the [env-run README](../packages/env-run/README.md).

5. **Start database:**

   ```bash
   pnpm db:up
   ```

6. **Run migrations:**

   ```bash
   pnpm db:migrate
   ```

7. **Seed database (optional):**

   ```bash
   pnpm db:seed
   ```

## Development Workflow

1. **Start development servers:**

   ```bash
   pnpm start
   ```

   This starts all applications (API, webapp, and marketing) concurrently.

   To start individual applications:

   ```bash
   pnpm api:start       # API only
   pnpm webapp:start    # Webapp only
   pnpm marketing:start # Marketing only
   ```

2. **Make changes** to your code

3. **Run tests** to ensure quality:

   ```bash
   pnpm test-unit    # Unit tests
   pnpm test-e2e     # E2E tests
   ```

   For comprehensive testing guidance, see [Testing Guide](testing.md).

4. **Commit changes** (Git hooks will run automatically)

## Docker Development

For development using Docker containers:

1. **Start all services:**

   ```bash
   pnpm docker:up
   ```

2. **Stop services:**

   ```bash
   pnpm docker:down
   ```

3. **View logs:**

   ```bash
   docker compose -f infra/compose.local.yml logs api
   ```

The Docker configuration automatically handles database connectivity between containers. The API service connects to the database using the service name `db` instead of `localhost`.

## Application Architecture

### Backend (NestJS)

The API is built with NestJS using the Fastify adapter for high performance.

**Key Features:**

- Fastify adapter for better performance
- Prisma ORM for database operations
- Swagger documentation at `/api/docs`
- Environment-based configuration
- Comprehensive error handling

**Structure:**

```
apps/api/
├── src/
│   ├── app/
│   │   ├── config/          # Configuration
│   │   ├── health/          # Health check module
│   │   ├── hello-world/     # Feature modules
│   │   └── app.module.ts    # Root module
│   ├── prisma.service.ts    # Database service
│   └── main.ts              # Application entry point
├── tests/                   # Test files
│   ├── e2e/                 # E2E tests
│   ├── helpers/             # Test helpers
│   └── unit/                # Unit tests
└── Dockerfile               # Container configuration
```

### Frontend (Nuxt 4)

Two Nuxt 4 applications: webapp (SPA) and marketing (static site).

**Key Features:**

- Tailwind CSS v4 with Vite plugin (using `@import "tailwindcss"` syntax)
- Nuxt UI components
- TypeScript support
- API proxy configuration
- SEO optimization

**Structure:**

```
apps/webapp/ (or marketing/)
├── pages/                 # Route pages
├── components/            # Vue components
├── assets/
│   └── css/
│       └── tailwind.css   # Tailwind styles (uses @import syntax)
├── tests/
│   ├── e2e/               # Cypress E2E tests
│   └── unit/              # Vitest unit tests
├── nuxt.config.ts         # Nuxt configuration
└── Dockerfile             # Container configuration
```

Tailwind CSS v4 uses a CSS-first configuration approach. The `tailwind.css` file uses `@import "tailwindcss"` instead of the legacy `@tailwind` directives.

## Database

### Prisma Schema

The database is managed with Prisma ORM. The schema is located at `packages/data-sources/prisma/schema.prisma`.

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

```bash
pnpm db:up           # Start database container
pnpm db:down         # Stop database container
pnpm db:migrate      # Apply migrations
pnpm db:reset        # Reset database (drops and recreates)
pnpm db:seed         # Seed database
pnpm db:studio       # Open Prisma Studio
pnpm db:test:studio  # Open Prisma Studio for E2E test database
```

## Code Quality

### Linting and Formatting

- **ESLint**: Enforced across all applications
- **Prettier**: Consistent code formatting
- **Git Hooks**: Automatic checks on commit/push

### Quality Commands

```bash
pnpm lint:check           # Check for issues
pnpm lint:fix             # Fix issues automatically
pnpm format:write         # Format all files
pnpm format:check         # Check formatting
pnpm typespec:validate    # Validate API specifications
pnpm all-check            # Run all CI checks
```

### Git Hooks

The project uses Husky for Git hooks:

- **Pre-commit**: Runs lint-staged to check only staged files
- **Pre-push**: Runs format check, lint check, TypeSpec validation, build, and unit tests

## Environment Configuration

This project uses the `env-run` utility to manage environment variables. It supports local `.env` files for bootstrapping development and integrates with Infisical for centralized secret management.

For detailed documentation on environment variable sourcing, precedence rules, and usage, see the [env-run README](../packages/env-run/README.md).

## Troubleshooting

### Common Issues

1. **Database connection failed:**
   - Ensure Docker is running
   - Check if database container is up: `docker ps`
   - Verify DATABASE_URL in .env file
   - Try restarting: `pnpm db:down && pnpm db:up`

2. **Port conflicts:**
   - Local dev uses 3000/3001/3002 by default
   - Local E2E uses 4000/4001/4002 via env-run with `--env=e2e-docker`
   - Update `PORT_*` variables in the appropriate env file if needed

3. **Cypress binary not found:**
   - Run `pnpm dev-setup` to install the Cypress binary
   - Or manually: `npx cypress install`

4. **Test failures:**
   - Ensure the appropriate env file is used for the context
   - Use env-run envs: dev-docker for Docker dev, e2e-docker for local E2E

5. **Build failures:**
   - Clear Nx cache: `npx nx reset`
   - Remove node_modules and reinstall: `rm -rf node_modules && pnpm install`

### Getting Help

- Review [Testing Guide](testing.md)
- Review [Deployment Guide](deployment.md)
- Open an issue on GitHub
