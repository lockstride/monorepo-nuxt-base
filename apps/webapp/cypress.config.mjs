import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: `${process.env.WEBAPP_DOMAIN || "http://127.0.0.1"}:${process.env.WEBAPP_PORT || "3000"}`,
    supportFile: false,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 4000,
    requestTimeout: 4000,
    responseTimeout: 4000,
    specPattern: "tests/e2e/**/*.cy.ts",
  },
});
