import { afterAll, beforeAll, vi } from "vitest";
import { installHermeticProcessEnvStrict } from "./helpers/env";

installHermeticProcessEnvStrict({ NODE_ENV: "test" });

beforeAll(() => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "debug").mockImplementation(() => undefined);
});

afterAll(() => {
  vi.restoreAllMocks();
});
