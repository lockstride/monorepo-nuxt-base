# Documentation

Comprehensive guides for developing, testing, and deploying applications in this monorepo.

## 📖 Guides

| Document                            | Description                                                      |
| ----------------------------------- | ---------------------------------------------------------------- |
| [Development Guide](development.md) | IDE setup, architecture, environment configuration, workflows    |
| [Testing Guide](testing.md)         | Testing philosophy, patterns, coverage strategy, best practices  |
| [Deployment Guide](deployment.md)   | Docker containerization, database migrations, production deploys |
| [Conventions](conventions.md)       | Code organization, naming standards, file structure rules        |

## 🏗️ Project Structure

```
monorepo-nuxt-base/
├── apps/                # Deployable applications
│   ├── api/            # NestJS REST API with Fastify
│   ├── webapp/         # Main Nuxt 4 application
│   └── marketing/      # Marketing site (Nuxt 4)
├── packages/           # Shared libraries
│   ├── data-sources/
│   │   └── prisma/    # Database schema and Prisma client
│   ├── env-run/       # Environment variable management
│   ├── ui/            # Shared UI components
│   └── utils/         # Shared utilities
├── infra/             # Docker Compose configurations
├── specs/             # TypeSpec API definitions
└── docs/              # This documentation
```

## ⚡ Quick Reference

### Key Principles

- **Single Version Policy** — All dependencies managed at root `package.json`
- **Nx Orchestration** — Use `nx run <project>:<target>` for targeted operations
- **Shared via Packages** — Extract shared code to `packages/`, avoid cross-app imports
- **100% Test Coverage** — Unit tests are the sole source of coverage metrics
- **Type Safety First** — TypeScript throughout the stack with strict configuration

### Common Commands

```bash
# Development
pnpm start              # Start all applications in watch mode
pnpm api:start          # Start API only
pnpm webapp:start       # Start webapp only
pnpm marketing:start    # Start marketing site only

# Testing
pnpm test-unit          # Run unit tests (fast, no coverage)
pnpm test-coverage      # Run tests with 100% coverage enforcement
pnpm test-e2e           # Run end-to-end tests with Cypress

# Code Quality
pnpm lint:check         # Check for linting issues
pnpm lint:fix           # Auto-fix linting issues
pnpm format:check       # Verify code formatting
pnpm format:write       # Format all files with Prettier
pnpm all-check          # Run full CI check locally

# Database
pnpm db:up              # Start PostgreSQL container
pnpm db:migrate         # Run database migrations
pnpm db:seed            # Seed database with sample data
pnpm db:studio          # Open Prisma Studio (database GUI)
```

## 🔗 Additional Resources

- [env-run README](../packages/env-run/README.md) — Environment variable management
- [Root README](../README.md) — Project overview and quick start
- [TypeSpec API Specs](../specs/) — API definitions and OpenAPI generation
