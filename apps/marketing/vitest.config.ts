import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: __dirname,
  plugins: [
    swc.vite({
      module: { type: "es6" },
      jsc: {
        parser: {
          syntax: "typescript",
          decorators: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
      },
    }),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["./tests/unit/**/*.spec.ts"],
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json", "json-summary"],
      all: true,
      reportsDirectory: "../../coverage/apps/marketing/unit",
      include: ["server/**/*.ts"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/tests/**",
        "**/*.d.ts",
        "**/coverage/**",
        "**/.nuxt/**",
        "**/cypress/**",
      ],
    },
  },
});
