---
name: project-conventions
description: Project architecture, coding conventions, and development standards. Use when creating files, modifying package.json/project.json, writing tests, making architectural decisions, or when a broad overview of the monorepo would be useful.
---

# Project Conventions

This monorepo uses **Nx**, **pnpm**, **NestJS** (Fastify), **Nuxt 4** (Vue 3), **Prisma**, **PostgreSQL**, **Vitest**, **Cypress**, and **Tailwind CSS**.

For comprehensive guidance, see [docs/README.md](../../docs/README.md).

## Quick Reference

### Architecture Boundaries

| Location    | Purpose                                                      |
| ----------- | ------------------------------------------------------------ |
| `apps/`     | Deployable applications (api, webapp, marketing)             |
| `packages/` | Shared libraries — extract here instead of cross-app imports |
| `infra/`    | Docker Compose configurations                                |

### Key Principles

- **Single Version Policy**: All dependencies at root `package.json`
- **Nx orchestration**: `nx run <project>:<target>` for targeted ops
- **No cross-app imports**: Share via `packages/`

## File Extensions

Use specific extensions — never `.js`:

- `.ts` — TypeScript (default)
- `.mts` / `.cts` — Explicit module type
- `.mjs` / `.cjs` — JavaScript with explicit module type

## Script Conventions

**Format**: `<component>:<operation>[:<modifier>]`

```bash
api:start           # Start API
webapp:test-unit    # Run webapp unit tests
lint:fix            # Fix lint issues globally
```

- Use `:` as namespace separator
- Use `-` within words: `test-unit`, `test-coverage`
- Define targets in `project.json`, not app `package.json`

See [docs/conventions.md](../../docs/conventions.md) for complete rules.

## Testing

**100% unit test coverage required** — E2E tests validate integration only.

### TDD Workflow

1. Write/update a failing test first
2. Implement minimal code to pass
3. Refactor while green

### Test Structure

```typescript
describe("Component", () => {
  describe("when <context>", () => {
    it("should <behavior>", () => {
      // Given: setup
      // When: action
      // Then: assertion
    });
  });
});
```

### Checklist

- [ ] Outer `describe` names the component/feature
- [ ] Nested `describe` for contexts: `when <condition>`
- [ ] `it` blocks: `should <behavior>`
- [ ] Assert observable behavior, not internals
- [ ] Mock external dependencies

See [docs/testing.md](../../docs/testing.md) for mocking patterns, coverage exceptions, and anti-patterns.

## Documentation

When making substantive changes, check if documentation needs updating:

- `README.md` — Project overview
- `docs/` — Detailed guides
- Package-specific READMEs
