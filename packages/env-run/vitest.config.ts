import { defineConfig } from "vitest/config";

export default defineConfig({
  root: __dirname,
  test: {
    environment: "node",
    globals: true,
    include: ["tests/unit/**/*.spec.ts", "tests/e2e/**/*.e2e.spec.ts"],
    setupFiles: ["tests/test-setup.ts"],
    silent: true,
    passWithNoTests: true,
    env: {
      NODE_ENV: "test",
    },
    reporters: ["default", "hanging-process"],
    coverage: {
      provider: "v8",
      all: true,
      include: ["src/**/*.ts"],
      // cli.ts contains the CLI entry point (main) which is tested via E2E tests
      exclude: ["src/cli.ts"],
      reporter: ["text", "html", "lcov", "json", "json-summary"],
      reportsDirectory: "../../coverage/packages/env-run/unit",
      ignoreEmptyLines: true,
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
});
