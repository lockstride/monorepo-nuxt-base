import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EnvRun } from "../../src/index";
import { withEnv } from "../helpers/env";

vi.mock("node:child_process", () => ({ spawn: vi.fn() }));
vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  realpathSync: vi.fn().mockImplementation((p) => p),
}));
vi.mock("../../src/logger");

describe("EnvRun", () => {
  let child: Partial<ChildProcess>;

  function setupSpawnSuccess() {
    child = {
      on: vi.fn().mockImplementation((event, cb) => {
        if (event === "exit") setTimeout(() => cb(0), 0);
        return child as ChildProcess;
      }),
    };
    vi.mocked(spawn).mockReturnValue(child as ChildProcess);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockImplementation((p) =>
      p.toString().endsWith("pnpm-workspace.yaml")
    );
    setupSpawnSuccess();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("when running in CI", () => {
    it("should bypass resolution and execute with process.env", async () => {
      await withEnv({ GITHUB_ACTIONS: "true", CI_FLAG: "yes" }, async () => {
        const app = new EnvRun({ env: "dev", command: ["echo", "hello"] });
        await app.run();

        expect(spawn).toHaveBeenCalledWith(
          "echo",
          ["hello"],
          expect.objectContaining({
            env: expect.objectContaining({
              CI_FLAG: "yes",
              GITHUB_ACTIONS: "true",
            }),
          })
        );
      });
    });
  });

  describe("when .env.<env> is present locally", () => {
    it("should use local values and spawn", async () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const s = p.toString();
        if (s.endsWith("pnpm-workspace.yaml")) return true;
        if (s.endsWith("/.env.dev")) return true;
        if (s.endsWith("/.env")) return true;
        return false;
      });
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const s = p.toString();
        if (s.endsWith("/.env.dev")) return "PORT=4000\nNAME=dev";
        if (s.endsWith("/.env")) return "PORT=3000";
        return "";
      });

      const app = new EnvRun({ env: "dev", command: ["node", "script.js"] });
      await app.run();

      const call = vi.mocked(spawn).mock.calls[0];
      expect(call[0]).toBe("node");
      expect(call[1]).toEqual(["script.js"]);
      expect((call[2] as { env: Record<string, string> }).env.PORT).toBe(
        "4000"
      );
      expect((call[2] as { env: Record<string, string> }).env.NAME).toBe("dev");
    });
  });

  describe("when --force-refresh is provided", () => {
    it("should fetch from Infisical and spawn", async () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const s = p.toString();
        if (s.endsWith("pnpm-workspace.yaml")) return true;
        if (s.endsWith("/.env")) return true;
        return false;
      });
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const s = p.toString();
        if (s.endsWith("/.env"))
          return "INFISICAL_MACHINE_IDENTITY_CLIENT_ID=id\nINFISICAL_MACHINE_IDENTITY_CLIENT_SECRET=sec\nINFISICAL_PROJECT_ID=proj";
        return "";
      });

      const { EnvironmentResolver: environmentResolver } =
        await import("../../src/environment-resolver");
      const resolverSpy = vi
        .spyOn(environmentResolver.prototype, "resolveEnvironment")
        .mockImplementation(
          async () =>
            ({
              finalEnv: { S: "1" },
              sourceData: {
                processEnv: {},
                baseEnv: {},
                overrideEnv: {},
                infisicalSecrets: { S: "1" },
                cliOverrides: {},
              },
              usedInfisical: true,
              filePaths: {
                baseEnvFile: `${process.cwd()}/.env`,
                overrideEnvFile: null,
              },
            }) as unknown as ReturnType<
              typeof environmentResolver.prototype.resolveEnvironment
            >
        );

      const app = new EnvRun({
        env: "staging",
        forceRefresh: true,
        command: ["npm", "start"],
      });
      await app.run();

      expect(resolverSpy).toHaveBeenCalledWith("staging", true, undefined);
      expect(spawn).toHaveBeenCalledWith(
        "npm",
        ["start"],
        expect.objectContaining({ env: expect.objectContaining({ S: "1" }) })
      );
    });
  });

  describe("when spawning child processes fails", () => {
    it("should reject on child non-zero exit code", async () => {
      const failingChild = {
        on: vi.fn().mockImplementation((event, cb) => {
          if (event === "exit") setTimeout(() => cb(2), 0);
          return failingChild as unknown as ChildProcess;
        }),
      } as unknown as ChildProcess;
      vi.mocked(spawn).mockReturnValueOnce(failingChild);
      const app = new EnvRun({ command: ["echo", "x"] });
      await expect(app.run()).rejects.toThrow(/Command exited with code 2/);
    });

    it("should reject on child error event", async () => {
      const errorChild = {
        on: vi.fn().mockImplementation((event, cb) => {
          if (event === "error")
            setTimeout(() => cb(new Error("spawn fail")), 0);
          return errorChild as unknown as ChildProcess;
        }),
      } as unknown as ChildProcess;
      vi.mocked(spawn).mockReturnValueOnce(errorChild);
      const app = new EnvRun({ command: ["node", "script.js"] });
      await expect(app.run()).rejects.toThrow(/spawn fail/);
    });
  });

  describe("when an error occurs during run in production", () => {
    it("should call process.exit(1) from run() catch", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        // @ts-expect-error - process.exit never returns
        .mockImplementation((() => undefined) as never);

      const { EnvironmentResolver: environmentResolver } =
        await import("../../src/environment-resolver");
      vi.spyOn(
        environmentResolver.prototype,
        "resolveEnvironment"
      ).mockImplementation(async () => {
        throw new Error("boom");
      });

      await withEnv({ NODE_ENV: "production" }, async () => {
        const app = new EnvRun({ env: "dev", command: [] });
        await app.run().catch(() => undefined);
        expect(exitSpy).toHaveBeenCalledWith(1);
      });
    });
  });

  describe("when credentials are missing and base .env provides them", () => {
    it("should load Infisical creds from .env before resolving", async () => {
      const creds =
        "INFISICAL_MACHINE_IDENTITY_CLIENT_ID=id\nINFISICAL_MACHINE_IDENTITY_CLIENT_SECRET=sec\nINFISICAL_PROJECT_ID=proj\nINFISICAL_SITE_URL=https://custom\n";
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const s = p.toString();
        if (s.endsWith("pnpm-workspace.yaml")) return true;
        if (s.endsWith("/.env")) return true;
        return false;
      });
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const s = p.toString();
        if (s.endsWith("/.env")) return creds;
        return "";
      });

      const { EnvironmentResolver: environmentResolver2 } =
        await import("../../src/environment-resolver");
      vi.spyOn(
        environmentResolver2.prototype,
        "resolveEnvironment"
      ).mockResolvedValue({
        finalEnv: {},
        sourceData: {
          processEnv: {},
          baseEnv: {},
          overrideEnv: {},
          infisicalSecrets: {},
          cliOverrides: {},
        },
        usedInfisical: false,
        filePaths: {
          baseEnvFile: `${process.cwd()}/.env`,
          overrideEnvFile: null,
        },
      } as unknown as ReturnType<
        typeof environmentResolver2.prototype.resolveEnvironment
      >);

      await withEnv(
        {
          INFISICAL_MACHINE_IDENTITY_CLIENT_ID: undefined,
          INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET: undefined,
          INFISICAL_PROJECT_ID: undefined,
        },
        async () => {
          const app = new EnvRun({ env: "dev", command: [] });
          await app.run();

          expect(process.env.INFISICAL_MACHINE_IDENTITY_CLIENT_ID).toBe("id");
          expect(process.env.INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET).toBe(
            "sec"
          );
          expect(process.env.INFISICAL_PROJECT_ID).toBe("proj");
          expect(process.env.INFISICAL_SITE_URL).toBe("https://custom");
        }
      );
    });
  });

  describe("when credentials are already in process.env", () => {
    it("should skip loading from .env file", async () => {
      vi.mocked(fs.existsSync).mockImplementation((p) =>
        p.toString().endsWith("pnpm-workspace.yaml")
      );

      const { EnvironmentResolver: environmentResolver4 } =
        await import("../../src/environment-resolver");
      vi.spyOn(
        environmentResolver4.prototype,
        "resolveEnvironment"
      ).mockResolvedValue({
        finalEnv: {},
        sourceData: {
          processEnv: {},
          baseEnv: {},
          overrideEnv: {},
          infisicalSecrets: {},
          cliOverrides: {},
        },
        usedInfisical: false,
        filePaths: {
          baseEnvFile: `${process.cwd()}/.env`,
          overrideEnvFile: null,
        },
      } as unknown as ReturnType<
        typeof environmentResolver4.prototype.resolveEnvironment
      >);

      await withEnv(
        {
          INFISICAL_MACHINE_IDENTITY_CLIENT_ID: "existing-id",
          INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET: "existing-sec",
          INFISICAL_PROJECT_ID: "existing-proj",
        },
        async () => {
          const app = new EnvRun({ env: "dev", command: [] });
          await app.run();

          // .env file should not have been read for credentials
          const readCalls = vi.mocked(fs.readFileSync).mock.calls;
          const envReadCalls = readCalls.filter((c) =>
            c[0].toString().endsWith("/.env")
          );
          expect(envReadCalls).toHaveLength(0);
        }
      );
    });
  });

  describe("when debug flag is set", () => {
    it("should render debug information", async () => {
      const { DebugRenderer: debugRendererClass } =
        await import("../../src/debug-renderer");
      const printSpy = vi
        .spyOn(debugRendererClass.prototype, "print")
        .mockImplementation(() => undefined);

      vi.mocked(fs.existsSync).mockImplementation((p) =>
        p.toString().endsWith("pnpm-workspace.yaml")
      );

      const { EnvironmentResolver: environmentResolver3 } =
        await import("../../src/environment-resolver");
      vi.spyOn(
        environmentResolver3.prototype,
        "resolveEnvironment"
      ).mockResolvedValue({
        finalEnv: { A: "1" },
        sourceData: {
          processEnv: {},
          baseEnv: { A: "1" },
          overrideEnv: {},
          infisicalSecrets: {},
          cliOverrides: {},
        },
        usedInfisical: false,
        filePaths: {
          baseEnvFile: `${process.cwd()}/.env`,
          overrideEnvFile: null,
        },
      } as unknown as ReturnType<
        typeof environmentResolver3.prototype.resolveEnvironment
      >);

      const app = new EnvRun({ env: "dev", debug: true, command: [] });
      await app.run();
      expect(printSpy).toHaveBeenCalled();
    });
  });
});
