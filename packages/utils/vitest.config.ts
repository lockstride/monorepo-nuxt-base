import { defineConfig } from "vitest/config";
export default defineConfig({
  root: __dirname,
  test: {
    environment: "node",
    passWithNoTests: true,
    include: ["./tests/unit/**/*.unit.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json"],
      all: true,
      reportsDirectory: "../../coverage/packages/utils/unit",
      include: ["src/**/*.ts"],
      exclude: ["**/node_modules/**", "**/dist/**", "**/tests/**"],
    },
  },
});
