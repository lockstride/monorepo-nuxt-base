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
    environment: "node",
    globals: true,
    include: ["./tests/e2e/**/*.e2e.spec.ts"],
    setupFiles: ["./tests/e2e/test-setup.ts"],
  },
});
