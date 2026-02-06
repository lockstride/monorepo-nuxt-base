import { defineConfig } from "vitest/config";
export default defineConfig({
  root: __dirname,
  test: {
    environment: "jsdom",
    passWithNoTests: true,
    include: ["./tests/unit/**/*.unit.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json"],
      all: true,
      reportsDirectory: "../../coverage/packages/ui/unit",
      include: ["src/**/*.ts"],
      exclude: ["**/node_modules/**", "**/dist/**", "**/tests/**"],
    },
  },
});
