# Agent Instructions

This file provides AI-specific guidance for working with this monorepo. For detailed conventions and workflows, use the skill and documentation system.

## Getting Started

1. **Use the skill**: Read `.claude/skills/project-conventions/SKILL.md` for architecture, testing patterns, and coding standards
2. **Check documentation**: See `docs/README.md` for comprehensive guides on development, testing, and deployment
3. **Follow conventions**: All changes must adhere to established patterns documented in `docs/conventions.md`

## Technology Stack

- **Monorepo**: Nx with pnpm workspaces
- **Backend**: NestJS (Fastify) + Prisma + PostgreSQL
- **Frontend**: Nuxt 4 (Vue 3) + Tailwind CSS
- **Testing**: Vitest (100% unit coverage required) + Cypress (E2E)

## Critical Rules

### Architecture

- Apps live in `apps/`, shared code in `packages/`
- **Never** import across apps — extract to `packages/` instead
- Single version policy: all dependencies at root `package.json`

### File Management

- Use `.ts`, `.mts`, `.cts`, `.mjs`, `.cjs` — **never** `.js`
- Scripts follow `<component>:<operation>` format in `project.json`
- Configuration files use appropriate extensions (`.mjs`, `.cjs` as needed)

### Testing

- **TDD workflow**: Write failing test → implement → refactor
- **100% unit test coverage** — no exceptions without explicit approval
- Tests in `tests/unit/` and `tests/e2e/` directories
- Mock all external dependencies (database, HTTP, filesystem)

### Code Quality

- Maintain encapsulation and separation of concerns
- Remove dead code aggressively
- Make only requested changes using the simplest idiomatic approach
- Update documentation when making substantive changes

## Common Operations

```bash
# Start development
pnpm start                    # All apps
pnpm api:start                # API only
pnpm webapp:start             # Webapp only
pnpm marketing:start          # Marketing only

# Testing
pnpm test-unit                # Unit tests
pnpm test-coverage            # With thresholds
pnpm test-e2e                 # E2E tests
pnpm all-check                # Full CI check

# Database
pnpm prisma:migrate-dev       # Create migration
pnpm prisma:migrate-deploy    # Apply migrations
pnpm prisma:studio            # GUI browser
```

## When to Update Documentation

Check if updates are needed when you:

- Modify architecture or project structure
- Add/remove dependencies or tools
- Change testing strategies or patterns
- Update deployment processes
- Establish new conventions or standards

Documentation files to consider:

- `docs/development.md` — Setup, architecture, troubleshooting
- `docs/testing.md` — Testing patterns and strategies
- `docs/deployment.md` — Docker, migrations, monitoring
- `docs/conventions.md` — Naming, organization, standards
- Package-specific READMEs

## Verification Steps

Before completing any task:

1. **Tests**: All tests pass, coverage at 100%
2. **Lints**: No linting errors introduced
3. **Build**: Affected projects build successfully
4. **Conventions**: Changes follow established patterns
5. **Documentation**: Updated if substantive changes made

## Resources

- **Skill**: `.claude/skills/project-conventions/SKILL.md` — Quick reference and patterns
- **Docs**: `docs/README.md` — Comprehensive guides
- **Conventions**: `docs/conventions.md` — Standards and naming rules
- **Project**: `README.md` — Overview and setup
