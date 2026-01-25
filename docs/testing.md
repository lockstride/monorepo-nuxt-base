# Testing Guide

This guide is the authoritative source for testing strategy, practices, and conventions in this monorepo.

## Testing Philosophy

Our testing strategy combines behavior-driven development (BDD), functional testing, and acceptance testing. Tests should be thorough, maintainable, resilient, and serve as living documentation.

### Test Type Separation

| Test Type      | Purpose                             | Coverage Role          | Execution Speed     |
| -------------- | ----------------------------------- | ---------------------- | ------------------- |
| **Unit Tests** | Test isolated logic, all code paths | 100% coverage source   | Fast (milliseconds) |
| **E2E Tests**  | Validate integration, user flows    | None (validation only) | Slow (seconds)      |

**Key Principle**: Unit tests are solely responsible for achieving 100% code coverage. E2E tests validate that the system works correctly as an integrated whole but do not contribute to coverage metrics.

### Core Principles

- **Behavior over implementation**: Assert observable behavior (inputs, outputs, side effects), not internal steps
- **Reduce brittleness**: Avoid asserting exact error messages, full object snapshots, or ordering that is not guaranteed
- **Isolate with mocks**: Mock all external systems (filesystem, network, database, time, randomness)
- **Evolve tests with behavior**: When modifying behavior or fixing a bug, update existing tests rather than adding parallel tests

## Coverage

### Thresholds & Enforcement

All projects require 100% coverage (branches, functions, lines, statements). Coverage is enforced at:

- **Pre-push hook**: Blocks push if thresholds not met
- **CI pipeline**: Fails PR/merge if thresholds not met

Use `test-unit` for fast local iteration without enforcement. Use `test-coverage` to verify thresholds.

### Provider

V8 via Vitest — near-zero overhead, no instrumentation required.

### Reports

After running `pnpm test-coverage`, HTML reports are available at:

```
coverage/
├── apps/
│   ├── api/unit/index.html
│   ├── marketing/unit/index.html
│   └── webapp/unit/index.html
└── packages/
    └── env-run/unit/index.html
```

## Test Infrastructure by Project

All unit tests use the `@nx/vitest:test` executor with V8 coverage provider.

### API (`apps/api`)

- **Unit Tests**: Vitest 4.x with `@nx/vitest:test` executor
  - Location: `apps/api/tests/unit/`
  - Pattern: `*.spec.ts`
  - Coverage: 100% enforced
- **E2E Tests**: Vitest against Dockerized API
  - Location: `apps/api/tests/e2e/`
  - Pattern: `*.e2e.spec.ts`
  - Coverage: Not collected (validation only)

### Nuxt Apps (`apps/webapp`, `apps/marketing`)

- **Unit Tests**: Vitest 4.x with `@nx/vitest:test` executor
  - Location: `apps/<app>/tests/unit/`
  - Pattern: `*.spec.ts`
  - Coverage: 100% enforced
- **E2E Tests**: Cypress against Dockerized app
  - Location: `apps/<app>/tests/e2e/`
  - Pattern: `*.cy.ts`
  - Coverage: Not collected (validation only)

### Packages (`packages/*`)

- **Unit Tests**: Vitest 4.x with `@nx/vitest:test` executor
  - Location: `packages/<pkg>/tests/unit/`
  - Pattern: `*.spec.ts` or `*.unit.spec.ts`
  - Coverage: 100% enforced

## Running Tests

```bash
# Unit tests (fast, no coverage)
pnpm test-unit
nx run api:test-unit

# Coverage tests (with threshold enforcement)
pnpm test-coverage
nx run api:test-coverage

# E2E tests
pnpm test-e2e
nx run webapp:test-e2e

# Cypress UI mode (debugging)
pnpm webapp:test-e2e:open
```

## Writing Tests

### Test Structure (BDD Style)

Use nested `describe` blocks with Given/When/Then structure:

```typescript
describe("Calculator", () => {
  // Outer describe: the component/feature under test

  describe("when adding two numbers", () => {
    // Nested describe: the context or scenario

    it("should return their sum", () => {
      // Given: set up preconditions
      const calculator = new Calculator();

      // When: perform the action
      const result = calculator.add(5, 3);

      // Then: assert the outcome
      expect(result).toBe(8);
    });
  });

  describe("when dividing by zero", () => {
    it("should throw an error", () => {
      const calculator = new Calculator();
      expect(() => calculator.divide(10, 0)).toThrow();
    });
  });
});
```

For simple cases, use user-story-style names: `it('should display error when input is invalid', ...)`

### Mocking Guidelines (Vitest 4.0+)

Mock all external dependencies to keep tests fast, isolated, and deterministic.

#### Basic Module Mocking

```typescript
import { vi, describe, it, expect, beforeEach } from "vitest";
import { UserService } from "./user.service";
import { DatabaseClient } from "./database";

// Mock the database module
vi.mock("./database");

describe("UserService", () => {
  let service: UserService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UserService();
  });

  it("should return user by id", async () => {
    // Given: mock the database response
    const mockUser = { id: "1", name: "Test User" };
    vi.mocked(DatabaseClient.findById).mockResolvedValue(mockUser);

    // When
    const result = await service.getUser("1");

    // Then
    expect(result).toEqual(mockUser);
    expect(DatabaseClient.findById).toHaveBeenCalledWith("1");
  });
});
```

#### Hoisted Mocks for SDK/Constructor Mocking

When mocking modules that export classes or constructors, use `vi.hoisted()` to define mock functions that are accessible both inside the mock factory and in tests:

```typescript
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MyClient } from "./my-client";
import { Logger } from "./logger";

// Define mocks using vi.hoisted() - these are hoisted to the top of the file
const { mockMethod, mockSdk } = vi.hoisted(() => {
  const mockMethodFn = vi.fn();
  const mockSdkFn = vi.fn(function () {
    return {
      doSomething: mockMethodFn,
    };
  });
  return {
    mockMethod: mockMethodFn,
    mockSdk: mockSdkFn,
  };
});

// Use the hoisted mocks in vi.mock()
vi.mock("external-sdk", () => ({
  ExternalSDK: mockSdk,
}));

describe("MyClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call SDK method", async () => {
    mockMethod.mockResolvedValue({ data: "result" });

    const client = new MyClient(new Logger());
    const result = await client.getData();

    expect(mockMethod).toHaveBeenCalled();
    expect(result).toEqual({ data: "result" });
  });
});
```

#### Environment Variable Isolation

Use the `withEnv` helper to safely set and restore environment variables:

```typescript
import { withEnv } from "../helpers/env";

it("should use credentials from environment", async () => {
  await withEnv(
    {
      API_KEY: "test-key",
      API_SECRET: "test-secret",
    },
    async () => {
      const client = new ApiClient();
      await client.authenticate();
      expect(mockLogin).toHaveBeenCalled();
    }
  );
  // Environment is automatically restored after the callback
});
```

**What to mock:**

- Filesystem operations (`vi.mock("node:fs")`)
- Network calls (HTTP, WebSocket)
- Database queries
- API calls to external services
- Time (`vi.useFakeTimers()`)
- Randomness (seed or mock)
- Environment variables (use `withEnv` helper)

### Achieving 100% Unit Test Coverage

To achieve 100% coverage from unit tests alone:

1. **Mock External Dependencies**: Use `vi.mock()` or dependency injection to isolate code under test
2. **Test All Branches**: Exercise every `if/else`, `switch` case, and ternary condition
3. **Cover Error Paths**: Test error handling, exceptions, and edge cases
4. **Use Factories/Builders**: Create reusable test data generators

### Coverage Exceptions

#### Preferred: Exclude CLI Entry Points from Coverage

For CLI entry points (`main()` functions), the preferred approach is to **separate them into a dedicated file that is excluded from unit test coverage**:

```typescript
// src/cli.ts - excluded from unit test coverage, tested via E2E
import { MyApp, parseArgs } from "./index.js";

async function main(): Promise<void> {
  const args = parseArgs();
  const app = new MyApp(args);
  await app.run();
}

const isMain = import.meta.url === `file://${realpathSync(process.argv[1])}`;
if (isMain) {
  main().catch((error) => {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}
```

```typescript
// vitest.config.ts
coverage: {
  include: ["src/**/*.ts"],
  exclude: ["src/cli.ts"], // CLI entry point tested via E2E
  thresholds: {
    branches: 100,
    functions: 100,
    lines: 100,
    statements: 100,
  },
}
```

This separation:

- Keeps all library code at 100% unit test coverage
- CLI bootstrap logic is validated by E2E tests
- No ignore comments needed for function coverage

#### Fallback: V8 Ignore Comments with @preserve

When code cannot be separated or meaningfully tested, use V8 ignore comments. **Important**: Since esbuild strips comments during TypeScript transpilation, you must add `-- @preserve` to keep the comment:

```typescript
/* v8 ignore next -- @preserve */
if (process.platform === "win32") {
  // Windows-specific handling
}

/* v8 ignore start: external callback -- @preserve */
externalLib.onReady(() => {
  this.ready = true;
});
/* v8 ignore stop -- @preserve */
```

**Ignore hint variants** (all equivalent with V8 provider):

- `/* v8 ignore next -- @preserve */`
- `/* c8 ignore next -- @preserve */`
- `/* istanbul ignore next -- @preserve */`

**Ignore hint types**:

- `next` - ignores the next statement/node
- `next N` - ignores the next N lines
- `start`/`stop` - ignores a range
- `if` - ignores the if branch
- `else` - ignores the else branch

**Requirements for exceptions**:

- Always include `-- @preserve` suffix (required for esbuild/TypeScript)
- Include a brief justification after the colon
- Only use when behavior cannot be deterministically exercised
- Acceptable cases: platform-specific guards, unreachable defensive code, terminal rendering

## Test File Organization

Centralize reusable test utilities in the `tests/` directory:

```
tests/
├── unit/              # Unit test files (*.spec.ts)
├── e2e/               # E2E test files (*.e2e.spec.ts or *.cy.ts)
├── helpers/           # Shared utility functions and test logic
├── fixtures/          # Small, composable test data
├── factories/         # Builders for creating valid domain objects
├── mocks/             # Reusable mocks for common externals
└── test-setup.ts      # Global hooks, timers, env defaults
```

Prefer factories/builders over static fixtures to reduce duplication.

## Reducing Test Brittleness

Avoid common patterns that make tests fragile:

| Brittle Pattern                    | Better Approach                                  |
| ---------------------------------- | ------------------------------------------------ |
| Assert exact error message strings | Assert error type, code, or substring            |
| Large object snapshots             | Assert specific fields that matter               |
| Assert array order                 | Assert as set, or use `expect.arrayContaining()` |
| Spy on private methods             | Assert observable behavior                       |
| Multiple actions per test          | One action per test, multiple assertions ok      |

## Best Practices

1. **Write tests first**: Follow TDD to ensure all code paths are covered
2. **Keep unit tests fast**: Mock all external I/O (database, network, filesystem)
3. **Test behavior, not implementation**: Assert observable outcomes, not internal details
4. **Use descriptive names**: Test names should document expected behavior
5. **Isolate test cases**: Each test should be independent and repeatable
6. **Don't chase metrics**: Focus on meaningful tests, not just coverage numbers
7. **Update, don't duplicate**: When behavior changes, update existing tests rather than adding new ones
8. **Remove redundant tests**: Delete tests whose intent is covered elsewhere
