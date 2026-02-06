import * as fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withEnv } from "../helpers/env";

// Mock FS and InfisicalClient at module level
vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

// Do not mock logger; real logger is fine for these tests

describe("EnvironmentResolver", () => {
  const monorepoRoot = "/fake/monorepo";
  let environmentResolverCtor: new (root: string, logger?: unknown) => unknown;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Import SUT after mocks are in place so it sees mocked InfisicalClient
    environmentResolverCtor = (await import("../../src/environment-resolver"))
      .EnvironmentResolver as unknown as typeof environmentResolverCtor;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setFiles(files: Record<string, string>) {
    vi.mocked(fs.existsSync).mockImplementation((p) => !!files[p.toString()]);
    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      const key = p.toString();
      if (!(key in files)) throw new Error("ENOENT");
      return files[key];
    });
    vi.mocked(fs.writeFileSync).mockImplementation(
      (p: unknown, data: unknown) => {
        const key = String(p);
        const content = typeof data === "string" ? data : String(data);
        files[key] = content;
        return undefined as unknown as void;
      }
    );
  }

  describe("when multiple sources exist", () => {
    it("should apply precedence: process < .env < Infisical < CLI", async () => {
      const envName = "test";
      const files: Record<string, string> = {
        [`${monorepoRoot}/.env`]: "BASE_ONLY=base\nCONFLICT=base\n",
      };
      setFiles(files);
      const resolver = new environmentResolverCtor(monorepoRoot) as unknown as {
        resolveEnvironment: (
          envName?: string,
          forceRefresh?: boolean,
          cliOverrides?: string[]
        ) => Promise<{
          finalEnv: Record<string, string>;
          usedInfisical: boolean;
        }>;
      };

      const secrets = { INFISICAL_ONLY: "infisical", CONFLICT: "infisical" };
      (
        resolver as unknown as {
          infisicalClient: { getSecrets: ReturnType<typeof vi.fn> };
        }
      ).infisicalClient = {
        getSecrets: vi.fn().mockResolvedValue(secrets),
      };

      const result = await withEnv(
        {
          P_ONLY: "yes",
          INFISICAL_MACHINE_IDENTITY_CLIENT_ID: "id",
          INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET: "sec",
          INFISICAL_PROJECT_ID: "proj",
        },
        () =>
          resolver.resolveEnvironment(envName, false, [
            "CONFLICT=cli",
            "CLI_ONLY=1",
          ])
      );

      expect(result.finalEnv).toEqual(
        expect.objectContaining({
          BASE_ONLY: "base",
          INFISICAL_ONLY: "infisical",
          CLI_ONLY: "1",
          P_ONLY: "yes",
          CONFLICT: "cli",
        })
      );
    });

    it("should skip CLI overrides without equals sign", async () => {
      const files: Record<string, string> = {
        [`${monorepoRoot}/.env`]: "A=1\n",
      };
      setFiles(files);
      const resolver = new environmentResolverCtor(monorepoRoot) as unknown as {
        resolveEnvironment: (
          envName?: string,
          forceRefresh?: boolean,
          cliOverrides?: string[]
        ) => Promise<{
          finalEnv: Record<string, string>;
          usedInfisical: boolean;
        }>;
      };

      const result = await resolver.resolveEnvironment(undefined, false, [
        "VALID=ok",
        "INVALID_NO_EQUALS",
        "ANOTHER=fine",
      ]);

      expect(result.finalEnv).toEqual(
        expect.objectContaining({
          A: "1",
          VALID: "ok",
          ANOTHER: "fine",
        })
      );
      expect(result.finalEnv).not.toHaveProperty("INVALID_NO_EQUALS");
    });
  });

  describe("when .env.<env> exists", () => {
    it("should use .env.<env> exclusively when present (no Infisical)", async () => {
      const envName = "local";
      const files: Record<string, string> = {
        [`${monorepoRoot}/.env.local`]: "A=1\nB=2\n",
        [`${monorepoRoot}/.env`]: "B=base\nC=3\n",
      };
      setFiles(files);

      const resolver = new environmentResolverCtor(monorepoRoot) as unknown as {
        resolveEnvironment: (
          envName?: string,
          forceRefresh?: boolean
        ) => Promise<{
          finalEnv: Record<string, string>;
          usedInfisical: boolean;
        }>;
      };
      const result = await resolver.resolveEnvironment(envName, false);

      expect(result.usedInfisical).toBe(false);
      expect(result.finalEnv).toEqual(
        expect.objectContaining({ A: "1", B: "2", C: "3" })
      );
    });
  });

  describe("when no .env.<env> exists and credentials are available", () => {
    it("should fetch from Infisical and write .env.<env>", async () => {
      const envName = "staging";
      const files: Record<string, string> = {
        [`${monorepoRoot}/.env`]:
          "INFISICAL_MACHINE_IDENTITY_CLIENT_ID=id\nINFISICAL_MACHINE_IDENTITY_CLIENT_SECRET=sec\nINFISICAL_PROJECT_ID=proj\n",
      };
      setFiles(files);

      const resolver = new environmentResolverCtor(monorepoRoot) as unknown as {
        resolveEnvironment: (
          envName?: string,
          forceRefresh?: boolean
        ) => Promise<{
          finalEnv: Record<string, string>;
          usedInfisical: boolean;
        }>;
      };

      const secrets = { API_KEY: "abc", DB_HOST: "db" };
      (
        resolver as unknown as {
          infisicalClient: { getSecrets: ReturnType<typeof vi.fn> };
        }
      ).infisicalClient = {
        getSecrets: vi.fn().mockResolvedValue(secrets),
      };

      const result = await resolver.resolveEnvironment(envName, false);
      expect(result.usedInfisical).toBe(true);
      expect(result.finalEnv).toEqual(expect.objectContaining(secrets));
      const written = (await import("node:fs")).readFileSync(
        `${monorepoRoot}/.env.${envName}`,
        "utf-8"
      );
      expect(written).toContain(
        "# This file was automatically generated by env-run"
      );
      expect(written).toContain("API_KEY=abc");
      expect(written).toContain("DB_HOST=db");
    });
  });

  describe("when forceRefresh is true and .env.<env> already exists", () => {
    it("should use Infisical and overwrite .env.<env>", async () => {
      const monorepoRoot = "/fake";
      const envName = "dev";
      const files: Record<string, string> = {
        [`${monorepoRoot}/.env`]:
          "INFISICAL_MACHINE_IDENTITY_CLIENT_ID=id\nINFISICAL_MACHINE_IDENTITY_CLIENT_SECRET=sec\nINFISICAL_PROJECT_ID=proj\n",
        [`${monorepoRoot}/.env.${envName}`]: "EXISTING=1",
      };

      vi.mocked((await import("node:fs")).existsSync).mockImplementation(
        (p) => !!files[p.toString()]
      );
      vi.mocked((await import("node:fs")).readFileSync).mockImplementation(
        (p) => files[p.toString()]
      );
      vi.mocked((await import("node:fs")).writeFileSync).mockImplementation(
        () => undefined as unknown as void
      );

      const resolverCtor = (await import("../../src/environment-resolver"))
        .EnvironmentResolver;
      const resolver = new resolverCtor(monorepoRoot) as unknown as {
        resolveEnvironment: (
          envName?: string,
          forceRefresh?: boolean
        ) => Promise<{
          finalEnv: Record<string, string>;
          usedInfisical: boolean;
        }>;
      };
      (
        resolver as unknown as {
          infisicalClient: { getSecrets: ReturnType<typeof vi.fn> };
        }
      ).infisicalClient = {
        getSecrets: vi.fn().mockResolvedValue({ NEW: "2" }),
      };

      const result = await resolver.resolveEnvironment(envName, true);
      expect(result.usedInfisical).toBe(true);
      expect(result.finalEnv).toEqual(expect.objectContaining({ NEW: "2" }));
      expect((await import("node:fs")).writeFileSync).toHaveBeenCalledWith(
        `${monorepoRoot}/.env.${envName}`,
        expect.stringContaining("NEW=2"),
        "utf8"
      );
    });
  });

  describe("when Infisical environment is not found", () => {
    it("should fall back gracefully", async () => {
      const envName = "nope";
      const files: Record<string, string> = {
        [`${monorepoRoot}/.env`]: "FALLBACK=v\n",
      };
      setFiles(files);

      const resolver = new environmentResolverCtor(monorepoRoot) as unknown as {
        resolveEnvironment: (
          envName?: string,
          forceRefresh?: boolean
        ) => Promise<{
          finalEnv: Record<string, string>;
          usedInfisical: boolean;
        }>;
      };

      const err = new Error("Environment with slug 'nope' not found");
      (err as Error & { name: string }).name = "EnvironmentNotFoundError";
      (
        resolver as unknown as {
          infisicalClient: { getSecrets: ReturnType<typeof vi.fn> };
        }
      ).infisicalClient = {
        getSecrets: vi.fn().mockRejectedValue(err),
      };

      const result = await withEnv(
        {
          INFISICAL_MACHINE_IDENTITY_CLIENT_ID: "id",
          INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET: "sec",
          INFISICAL_PROJECT_ID: "proj",
        },
        () => resolver.resolveEnvironment(envName, false)
      );
      expect(result.usedInfisical).toBe(false);
      expect(result.finalEnv).toEqual(
        expect.objectContaining({ FALLBACK: "v" })
      );
    });
  });

  describe("when credentials are invalid", () => {
    it("should fail", async () => {
      const envName = "prod";
      const files: Record<string, string> = {
        [`${monorepoRoot}/.env`]:
          "INFISICAL_MACHINE_IDENTITY_CLIENT_ID=id\nINFISICAL_MACHINE_IDENTITY_CLIENT_SECRET=sec\nINFISICAL_PROJECT_ID=proj\n",
      };
      setFiles(files);

      const resolver = new environmentResolverCtor(monorepoRoot) as unknown as {
        resolveEnvironment: (
          envName?: string,
          forceRefresh?: boolean
        ) => Promise<unknown>;
      };
      (
        resolver as unknown as {
          infisicalClient: { getSecrets: ReturnType<typeof vi.fn> };
        }
      ).infisicalClient = {
        getSecrets: vi
          .fn()
          .mockRejectedValue(new Error("Authentication failed: invalid")),
      };

      await expect(resolver.resolveEnvironment(envName, false)).rejects.toThrow(
        /Authentication failed/
      );
    });
  });

  describe("when no envName is provided", () => {
    it("should load .env and filtered process", async () => {
      const files: Record<string, string> = {
        [`${monorepoRoot}/.env`]: "X=1\n",
      };
      setFiles(files);

      const resolver = new environmentResolverCtor(monorepoRoot) as unknown as {
        resolveEnvironment: (
          envName?: string,
          forceRefresh?: boolean
        ) => Promise<{
          finalEnv: Record<string, string>;
          usedInfisical: boolean;
        }>;
      };

      const result = await withEnv(
        { X: "process-should-be-overridden", P_ONLY: "yes" },
        async () => resolver.resolveEnvironment(undefined, false)
      );
      expect(result.usedInfisical).toBe(false);
      expect(result.finalEnv).toEqual(
        expect.objectContaining({ X: "1", P_ONLY: "yes" })
      );
    });

    it("should not use Infisical when envName is undefined even with forceRefresh", async () => {
      const files: Record<string, string> = {
        [`${monorepoRoot}/.env`]: "BASE=1\n",
      };
      setFiles(files);

      const resolver = new environmentResolverCtor(monorepoRoot) as unknown as {
        resolveEnvironment: (
          envName?: string,
          forceRefresh?: boolean
        ) => Promise<{
          finalEnv: Record<string, string>;
          usedInfisical: boolean;
        }>;
      };

      const mockGetSecrets = vi
        .fn()
        .mockResolvedValue({ FROM_INFISICAL: "secret" });
      (
        resolver as unknown as {
          infisicalClient: { getSecrets: ReturnType<typeof vi.fn> };
        }
      ).infisicalClient = {
        getSecrets: mockGetSecrets,
      };

      const result = await withEnv(
        {
          INFISICAL_MACHINE_IDENTITY_CLIENT_ID: "id",
          INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET: "sec",
          INFISICAL_PROJECT_ID: "proj",
        },
        async () => resolver.resolveEnvironment(undefined, true)
      );

      // Infisical is never used when envName is undefined (by design)
      expect(result.usedInfisical).toBe(false);
      expect(mockGetSecrets).not.toHaveBeenCalled();
      expect(result.finalEnv).toEqual(expect.objectContaining({ BASE: "1" }));
    });
  });

  describe("when falling back to base .env", () => {
    it("should use base .env when envName provided but no override file or credentials", async () => {
      const monorepoRoot = "/fake/monorepo";
      vi.mocked(fs.existsSync).mockImplementation((p) =>
        p.toString().endsWith("/.env")
      );
      vi.mocked(fs.readFileSync).mockReturnValue("SOME=1\n");
      const { EnvironmentResolver: environmentResolver } =
        await import("../../src/environment-resolver");
      const resolver = new environmentResolver(monorepoRoot) as unknown as {
        resolveEnvironment: (
          envName?: string,
          forceRefresh?: boolean
        ) => Promise<{
          finalEnv: Record<string, string>;
          usedInfisical: boolean;
        }>;
      };
      const result = await resolver.resolveEnvironment("dev", false);
      expect(result.usedInfisical).toBe(false);
      expect(result.finalEnv).toEqual(expect.objectContaining({ SOME: "1" }));
    });

    it("should use base .env when forceRefresh requested but no Infisical credentials available", async () => {
      const result = await withEnv(
        {
          INFISICAL_MACHINE_IDENTITY_CLIENT_ID: undefined,
          INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET: undefined,
          INFISICAL_PROJECT_ID: undefined,
        },
        async () => {
          const monorepoRoot = "/fake/monorepo";
          vi.mocked(fs.existsSync).mockImplementation((p) =>
            p.toString().endsWith("/.env")
          );
          vi.mocked(fs.readFileSync).mockReturnValue("SOME=1\n");
          const { EnvironmentResolver: environmentResolver } =
            await import("../../src/environment-resolver");
          const resolver = new environmentResolver(monorepoRoot) as unknown as {
            resolveEnvironment: (
              envName?: string,
              forceRefresh?: boolean
            ) => Promise<{
              finalEnv: Record<string, string>;
              usedInfisical: boolean;
            }>;
          };
          (
            resolver as unknown as {
              infisicalClient: { getSecrets: ReturnType<typeof vi.fn> };
            }
          ).infisicalClient = {
            getSecrets: vi
              .fn()
              .mockRejectedValue(new Error("Not authenticated to Infisical")),
          };

          return resolver.resolveEnvironment("dev", true);
        }
      );
      expect(result.usedInfisical).toBe(false);
      expect(result.finalEnv).toEqual(expect.objectContaining({ SOME: "1" }));
    });
  });
});
