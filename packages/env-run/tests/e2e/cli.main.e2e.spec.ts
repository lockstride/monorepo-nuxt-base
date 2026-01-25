import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withEnv } from "../helpers/env";

// Compute absolute path to the CLI module under test
const cliTsPath = realpathSync(resolve(__dirname, "../../src/cli.ts"));

describe("EnvRun main (e2e-lite)", () => {
  let originalArgv: string[];
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    originalArgv = [...process.argv];
    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      // @ts-expect-error - process.exit never returns
      return undefined;
    }) as never);
  });

  afterEach(() => {
    process.argv = originalArgv;
    vi.restoreAllMocks();
  });

  describe("when --help flag is provided", () => {
    it("should print help and exit with code 0", async () => {
      // Given: --help flag and no command
      process.argv = ["node", cliTsPath, "--help"]; // triggers isMain

      // When: importing the CLI module
      await import("../../src/cli");

      // Then: process exits cleanly
      expect(exitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe("when --debug flag is provided", () => {
    it("should spawn command without hard exit", async () => {
      // Given: debug flag and a command to execute
      const spawnMock = vi.fn().mockReturnValue({
        on: vi
          .fn()
          .mockImplementation((event: string, cb: (code: number) => void) => {
            if (event === "exit") setTimeout(() => cb(0), 0);
          }),
      });
      vi.doMock("node:child_process", () => ({ spawn: spawnMock }));

      vi.resetModules();
      process.argv = ["node", cliTsPath, "--debug", "--", "echo", "hello"];

      // When: importing the CLI module
      await import("../../src/cli");

      // Then: command is spawned and no hard exit occurs
      expect(spawnMock).toHaveBeenCalled();
      expect(exitSpy).not.toHaveBeenCalled();
    });
  });

  describe("when running in CI environment", () => {
    it("should bypass resolution and exit when no command provided", async () => {
      // Given: CI environment and no command
      const spawnMock = vi.fn();
      vi.doMock("node:child_process", () => ({ spawn: spawnMock }));

      vi.resetModules();
      await withEnv({ GITHUB_ACTIONS: "true" }, async () => {
        process.argv = ["node", cliTsPath, "--env=dev"];

        // When: importing the CLI module
        await import("../../src/cli");

        // Then: no spawn occurs and process exits cleanly
        expect(spawnMock).not.toHaveBeenCalled();
        expect(exitSpy).toHaveBeenCalledWith(0);
      });
    });
  });
});
