# Conventions

Standards for code organization, naming conventions, and file structure across the monorepo.

## File Extensions

Always use appropriately specific file extensions for JavaScript-like files:

| Extension | Use Case                                            |
| --------- | --------------------------------------------------- |
| `.ts`     | TypeScript source files (default for all new files) |
| `.mts`    | TypeScript ES modules (explicit module type needed) |
| `.cts`    | TypeScript CommonJS modules (explicit CJS needed)   |
| `.mjs`    | JavaScript ES modules (JS with explicit ESM)        |
| `.cjs`    | JavaScript CommonJS modules (JS with explicit CJS)  |

**Never use `.js`** — it's ambiguous regarding module system and should be avoided entirely.

## Script Organization

### Location Principles

Scripts and targets should be organized according to their scope and purpose:

| Location            | Purpose                                                                    |
| ------------------- | -------------------------------------------------------------------------- |
| `project.json`      | All app-specific Nx targets (`serve`, `build`, `test-unit`, `test-e2e`)    |
| App `package.json`  | Package metadata and dependencies only — **no scripts**                    |
| Root `package.json` | Global orchestration via `nx run-many` and convenience component shortcuts |

This separation ensures clear ownership and maintains Nx's ability to cache and orchestrate tasks efficiently.

### Naming Convention

Script names follow a consistent hierarchical pattern:

```
<component>:<operation>[:<modifier>]
```

**Components**: `api`, `webapp`, `marketing`, `db`, `docker`
**Operations**: `start`, `build`, `test-unit`, `test-e2e`, `lint`
**Modifiers**: `fix`, `open`, `watch`

#### Rules

- Use `:` as the namespace separator between segments
- Use `-` within words (kebab-case): `test-unit`, `test-coverage`, `test-e2e`
- Drop redundant segments for brevity: `api:start` not `api:dev:start`
- Keep names concise and predictable

#### Examples

```bash
# ✅ Valid
api:start
webapp:test-unit
webapp:test-e2e:open
lint:fix
format:check

# ❌ Invalid
api:build              # Too ambiguous — use api:start or nx build api
webapp:test-lint-fix   # Mixed separators (- and :)
test_unit              # Wrong separator (underscore instead of hyphen)
```

### Script Organization in Root package.json

Group scripts logically with comment separators for better organization and navigation:

```json
{
  "scripts": {
    "//-- GLOBAL SCRIPTS --//": "--------------------------------",
    "start": "nx run-many --target=serve ...",
    "build": "nx run-many --target=build ...",
    "test-unit": "nx run-many --target=test-unit ...",
    "test-coverage": "nx run-many --target=test-coverage ...",
    "test-e2e": "nx run-many --target=test-e2e ...",

    "//-- COMPONENT SCRIPTS --//": "--------------------------------",
    "api:start": "nx run api:serve",
    "webapp:start": "nx run webapp:serve",
    "marketing:start": "nx run marketing:serve",

    "//-- DATABASE SCRIPTS --//": "--------------------------------",
    "db:up": "nx run prisma:db:setup",
    "db:migrate": "nx run prisma:db:migrate",
    "db:seed": "nx run prisma:db:seed"
  }
}
```

#### Ordering Guidelines

1. **Global scripts first** (no component prefix) — sorted alphabetically within group
2. **Component-specific scripts** — grouped by component, sorted alphabetically within each group
3. **Use semantic grouping** — related operations stay together (e.g., all database operations)

## Nx Targets

Define build, test, and development targets in `project.json` using kebab-case naming:

```json
{
  "targets": {
    "serve": {},
    "build": {},
    "test-unit": {},
    "test-e2e": {},
    "test-coverage": {},
    "lint": {}
  }
}
```

### Best Practices

- **Use Nx executors** over raw shell commands when available for better caching and dependency tracking
- **Keep target names consistent** across all projects (e.g., always use `serve`, not `dev` or `start`)
- **Leverage Nx's dependency graph** by declaring target dependencies when appropriate
- **Configure caching** for deterministic targets to speed up CI and local builds
