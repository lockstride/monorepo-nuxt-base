# Testing Guide

Comprehensive guide to testing strategy, practices, and conventions for achieving and maintaining 100% test coverage across the monorepo.

## Testing Philosophy

Our testing strategy combines behavior-driven development (BDD), functional testing principles, and acceptance testing to create thorough, maintainable tests that serve as living documentation.

### Core Principles

- **Behavior over implementation** — Assert observable behavior (inputs, outputs, side effects), not internal implementation details
- **Reduce brittleness** — Avoid testing exact error messages, full object snapshots, or non-guaranteed ordering
- **Isolate with mocks** — Mock all external systems (filesystem, network, database, time, randomness) for fast, deterministic tests
- **Evolve tests with behavior** — When modifying behavior or fixing bugs, update existing tests rather than adding redundant parallel tests
- **Test-Driven Development** — Write failing tests first, implement minimal code to pass, then refactor

### Test Type Separation

Different test types serve distinct purposes and have clear boundaries:

| Test Type      | Purpose                                  | Coverage Contribution | Execution Speed     |
| -------------- | ---------------------------------------- | --------------------- | ------------------- |
| **Unit Tests** | Test isolated logic and all code paths   | 100% (primary source) | Fast (milliseconds) |
| **E2E Tests**  | Validate integration and real user flows | None (validation)     | Slow (seconds)      |

**Critical Distinction**: Unit tests are solely responsible for achieving 100% code coverage. E2E tests validate that the integrated system works correctly but do not contribute to coverage metrics.

## Coverage Strategy

### Thresholds and Enforcement

All projects require **100% code coverage** across all metrics:

- **Branches**: 100%
- **Functions**: 100%
- **Lines**: 100%
- **Statements**: 100%

Coverage is enforced at multiple checkpoints:

- **Pre-push hook** — Blocks push if thresholds not met
- **CI pipeline** — Fails PR/merge if coverage drops below 100%
- **Local verification** — Use `test-coverage` target before committing

### Test Commands

```bash
pnpm test-unit          # Fast unit tests without coverage (local iteration)
pnpm test-coverage      # Unit tests with 100% threshold enforcement
```

Use `test-unit` for rapid local development and debugging. Use `test-coverage` before committing to verify all thresholds are met.

### Coverage Provider

This project uses **V8 coverage** via Vitest:

- **Near-zero overhead** — No instrumentation required
- **Native performance** — Built into Node.js/V8
- **Accurate metrics** — Direct from JavaScript engine

### Coverage Reports

After running `pnpm test-coverage`, HTML reports are generated at:

```
coverage/
├── apps/
│   ├── api/unit/index.html
│   ├── marketing/unit/index.html
│   └── webapp/unit/index.html
└── packages/
    └── env-run/unit/index.html
```

Open these HTML files in your browser to explore line-by-line coverage and identify untested code paths.

## Test Infrastructure

### Testing Framework

All unit tests use **Vitest 4.x** with the `@nx/vitest:test` executor for optimal Nx integration and caching.

### API Tests (`apps/api`)

#### Unit Tests

- **Framework**: Vitest 4.x with `@nx/vitest:test` executor
- **Location**: `apps/api/tests/unit/`
- **Pattern**: `*.spec.ts`
- **Coverage**: 100% enforced
- **Runner**: `@nx/vitest:test` with V8 coverage provider

#### E2E Tests

- **Framework**: Vitest against Dockerized API
- **Location**: `apps/api/tests/e2e/`
- **Pattern**: `*.e2e.spec.ts`
- **Coverage**: Not collected (validation only)
- **Database**: Isolated PostgreSQL instance for E2E

### Nuxt Application Tests (`apps/webapp`, `apps/marketing`)

#### Unit Tests

- **Framework**: Vitest 4.x with `@nx/vitest:test` executor
- **Location**: `apps/<app>/tests/unit/`
- **Pattern**: `*.spec.ts`
- **Coverage**: 100% enforced
- **Environment**: happy-dom for DOM simulation

#### E2E Tests

- **Framework**: Cypress 15+ against Dockerized application
- **Location**: `apps/<app>/tests/e2e/`
- **Pattern**: `*.cy.ts`
- **Coverage**: Not collected (validation only)
- **Browser**: Chrome (headless in CI)

### Package Tests (`packages/*`)

#### Unit Tests

- **Framework**: Vitest 4.x with `@nx/vitest:test` executor
- **Location**: `packages/<pkg>/tests/unit/`
- **Pattern**: `*.spec.ts` or `*.unit.spec.ts`
- **Coverage**: 100% enforced

## Running Tests

### All Projects

```bash
# Unit tests (fast, no coverage enforcement)
pnpm test-unit

# Coverage tests (with 100% threshold enforcement)
pnpm test-coverage

# E2E tests (all applications)
pnpm test-e2e

# Complete CI check (format, lint, build, coverage, e2e)
pnpm all-check
```

### Individual Projects

```bash
# API tests
nx run api:test-unit          # Unit tests only
nx run api:test-coverage      # With coverage enforcement
nx run api:test-e2e           # E2E tests

# Webapp tests
nx run webapp:test-unit
nx run webapp:test-coverage
nx run webapp:test-e2e

# Marketing tests
nx run marketing:test-unit
nx run marketing:test-coverage
nx run marketing:test-e2e

# Package tests
nx run env-run:test-unit
nx run env-run:test-coverage
```

### Cypress Interactive Mode

For debugging E2E tests with the Cypress UI:

```bash
pnpm webapp:test-e2e:open      # Open Cypress UI for webapp
pnpm marketing:test-e2e:open   # Open Cypress UI for marketing
```

This launches the Cypress Test Runner where you can run tests individually, inspect DOM state, and debug failures interactively.

## Writing Tests

### Test Structure (BDD Style)

Use nested `describe` blocks with Given/When/Then structure for clarity and organization:

```typescript
describe("Calculator", () => {
  // Outer describe: the component or feature under test

  describe("when adding two positive numbers", () => {
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
      // Given
      const calculator = new Calculator();

      // When/Then (combined for exception testing)
      expect(() => calculator.divide(10, 0)).toThrow();
    });
  });
});
```

#### Naming Guidelines

- **Outer `describe`**: Name the component/feature: `describe("UserService", ...)`
- **Nested `describe`**: Set context with "when": `describe("when user is authenticated", ...)`
- **`it` blocks**: Complete sentences with "should": `it("should return user profile", ...)`

For simple, self-explanatory tests, you can use user-story-style names directly:

```typescript
it("should display validation error when email is invalid", () => {
  // test implementation
});
```

### Mocking Guidelines

Mock all external dependencies to keep tests fast, isolated, and deterministic. This project uses **Vitest 4.x** mocking APIs.

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
    vi.clearAllMocks(); // Reset mocks between tests
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

#### Hoisted Mocks for Constructors and SDKs

When mocking modules that export classes or constructors, use `vi.hoisted()` to define mock functions that are accessible in both the mock factory and your tests:

```typescript
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MyClient } from "./my-client";
import { Logger } from "./logger";

// Define mocks using vi.hoisted() - these are hoisted to the top
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
    // Given
    mockMethod.mockResolvedValue({ data: "result" });

    // When
    const client = new MyClient(new Logger());
    const result = await client.getData();

    // Then
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
      // Given
      const client = new ApiClient();

      // When
      await client.authenticate();

      // Then
      expect(mockLogin).toHaveBeenCalledWith({
        apiKey: "test-key",
        apiSecret: "test-secret",
      });
    }
  );
  // Environment is automatically restored after the callback
});
```

#### What to Mock

Always mock these external dependencies:

- **Filesystem operations** — `vi.mock("node:fs")`, `vi.mock("node:fs/promises")`
- **Network calls** — HTTP requests, WebSocket connections
- **Database queries** — Prisma, SQL, ORMs
- **External APIs** — Third-party service calls
- **Time** — `vi.useFakeTimers()` for date/time-dependent code
- **Randomness** — Mock or seed `Math.random()`
- **Environment variables** — Use `withEnv` helper for isolation
- **Process interactions** — `process.exit()`, `process.stdout`

### Achieving 100% Unit Test Coverage

To achieve 100% coverage from unit tests alone:

1. **Mock External Dependencies**
   - Use `vi.mock()` to isolate code under test
   - Use dependency injection where appropriate
   - Mock at module boundaries for better test isolation

2. **Test All Branches**
   - Exercise every `if/else` condition
   - Cover all `switch` cases
   - Test ternary operators with both outcomes
   - Include default/fallback paths

3. **Cover Error Paths**
   - Test exception throwing and catching
   - Validate error messages and types
   - Test edge cases (null, undefined, empty arrays, etc.)
   - Verify graceful degradation

4. **Use Factories and Builders**
   - Create reusable test data generators
   - Avoid duplication with fixtures
   - Build valid domain objects programmatically

5. **Leverage Test Helpers**
   - Centralize common setup in `beforeEach`
   - Extract reusable assertions to helper functions
   - Use shared mocks for common dependencies

### Coverage Exceptions

In rare cases, some code cannot be meaningfully tested in isolation. Use coverage exceptions sparingly and document the reasoning.

#### Preferred: Separate and Exclude CLI Entry Points

For CLI entry points (`main()` functions), **separate them into a dedicated file excluded from unit test coverage**:

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

Configure Vitest to exclude the CLI file:

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

**Benefits of this approach**:

- All library code maintains 100% unit test coverage
- CLI bootstrap logic is validated by E2E tests
- No ignore comments needed
- Clear separation of concerns

#### Fallback: V8 Ignore Comments with @preserve

When code cannot be separated or meaningfully tested, use V8 ignore comments. **Critical**: Since esbuild strips comments during TypeScript transpilation, you must add `-- @preserve` to keep the comment:

```typescript
/* v8 ignore next -- @preserve */
if (process.platform === "win32") {
  // Windows-specific handling that can't be tested on other platforms
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

| Type     | Effect                                    | Example                                   |
| -------- | ----------------------------------------- | ----------------------------------------- |
| `next`   | Ignores the next statement/node           | `/* v8 ignore next -- @preserve */`       |
| `next N` | Ignores the next N lines                  | `/* v8 ignore next 3 -- @preserve */`     |
| `start`  | Begins an ignored range (requires `stop`) | `/* v8 ignore start: reason @preserve */` |
| `stop`   | Ends an ignored range                     | `/* v8 ignore stop -- @preserve */`       |
| `if`     | Ignores only the if branch                | `/* v8 ignore if -- @preserve */`         |
| `else`   | Ignores only the else branch              | `/* v8 ignore else -- @preserve */`       |

**Requirements for coverage exceptions**:

- **Always** include `-- @preserve` suffix (required for esbuild/TypeScript compatibility)
- Include a brief justification after the colon
- Only use when behavior cannot be deterministically exercised in tests
- Acceptable cases: platform-specific guards, unreachable defensive code, terminal rendering
- Review during code review to ensure exceptions are justified

## Test File Organization

Centralize reusable test utilities for maintainability and consistency:

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

### Organization Guidelines

- **Keep unit tests focused** — One test file per source file
- **Mirror source structure** — `src/app/user.service.ts` → `tests/unit/user.service.spec.ts`
- **Centralize helpers** — Shared utilities in `tests/helpers/`
- **Use factories over fixtures** — Generate data programmatically to reduce duplication
- **Mock at the right level** — Shared mocks in `tests/mocks/`, test-specific mocks inline

## Reducing Test Brittleness

Avoid common patterns that make tests fragile and prone to false failures:

| Brittle Pattern                    | Better Approach                                           |
| ---------------------------------- | --------------------------------------------------------- |
| Assert exact error message strings | Assert error type, error code, or message substring       |
| Large object snapshots             | Assert specific fields that matter to the behavior        |
| Assert array order                 | Assert as set with `toContain()` or `arrayContaining()`   |
| Spy on private methods             | Assert observable behavior and side effects               |
| Multiple actions per test          | One action per test; multiple assertions are fine         |
| Hard-coded timestamps              | Use `vi.useFakeTimers()` or relative time assertions      |
| Brittle CSS selectors in E2E       | Use `data-testid` attributes for stable element selection |

### Example: Flexible Error Assertions

```typescript
// ❌ Brittle - exact message match
expect(error.message).toBe("User not found with ID: 123");

// ✅ Better - type and substring
expect(error).toBeInstanceOf(NotFoundError);
expect(error.message).toContain("User not found");

// ✅ Best - error code
expect(error.code).toBe("USER_NOT_FOUND");
```

### Example: Flexible Object Assertions

```typescript
// ❌ Brittle - full snapshot
expect(result).toMatchSnapshot();

// ✅ Better - assert relevant fields
expect(result).toMatchObject({
  id: expect.any(String),
  email: "test@example.com",
  role: "admin",
});
```

## Best Practices

### Development Workflow

1. **Write tests first (TDD)** — Follow red-green-refactor cycle:
   - Write a failing test for the desired behavior
   - Implement minimal code to make it pass
   - Refactor while tests remain green

2. **Keep unit tests fast** — Mock all external I/O (database, network, filesystem, time)
   - Unit tests should run in milliseconds, not seconds
   - Fast tests enable rapid iteration and TDD

3. **Test behavior, not implementation** — Assert observable outcomes, not internal details
   - Don't test private methods directly
   - Don't assert call counts unless they're part of the contract
   - Focus on inputs, outputs, and side effects

4. **Use descriptive test names** — Test names should document expected behavior
   - Read like specifications: "should return user when ID is valid"
   - Provide context: "when user is authenticated" (nested describe)
   - Be specific about edge cases: "should throw error when ID is null"

5. **Isolate test cases** — Each test should be independent and repeatable
   - Use `beforeEach` to reset state
   - Don't share mutable state between tests
   - Tests should pass regardless of execution order

### Maintenance

6. **Don't chase metrics** — Focus on meaningful tests, not just coverage numbers
   - Coverage is a tool, not a goal
   - 100% coverage doesn't guarantee bug-free code
   - Prioritize testing critical paths and edge cases

7. **Update, don't duplicate** — When behavior changes, update existing tests
   - Avoid parallel tests that validate the same behavior
   - Remove redundant or obsolete tests
   - Keep test suite lean and maintainable

8. **Remove dead tests** — Delete tests whose intent is covered elsewhere
   - Regular refactoring applies to tests too
   - Duplicate tests add maintenance burden without value

### Code Quality

9. **Extract test helpers** — DRY applies to test code too
   - Create factories for common test data
   - Extract setup logic to helper functions
   - Share mocks for common dependencies

10. **Review test failures carefully** — A failing test is valuable information
    - Understand why it failed before fixing
    - Consider if the test or the code needs updating
    - Avoid the temptation to disable flaky tests without investigation
