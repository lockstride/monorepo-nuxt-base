import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InfisicalClient } from "../../src/infisical-client";
import { Logger } from "../../src/logger";
import { withEnv } from "../helpers/env";

const { mockLogin, mockListSecrets, mockInfisicalSDK } = vi.hoisted(() => {
  const mockLoginFn = vi.fn();
  const mockListSecretsFn = vi.fn();
  const mockSDK = vi.fn(function (this: unknown) {
    return {
      auth: () => ({ universalAuth: { login: mockLoginFn } }),
      secrets: () => ({ listSecrets: mockListSecretsFn }),
    };
  });
  return {
    mockLogin: mockLoginFn,
    mockListSecrets: mockListSecretsFn,
    mockInfisicalSDK: mockSDK,
  };
});

vi.mock("@infisical/sdk", () => ({
  InfisicalSDK: mockInfisicalSDK,
}));

vi.mock("../../src/logger");

describe("InfisicalClient", () => {
  let logger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();
    logger = new Logger();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("when authenticating", () => {
    it("should authenticate once then reuse session", async () => {
      await withEnv(
        {
          INFISICAL_MACHINE_IDENTITY_CLIENT_ID: "id",
          INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET: "sec",
          INFISICAL_PROJECT_ID: "proj",
        },
        async () => {
          mockLogin.mockResolvedValue(undefined);
          mockListSecrets.mockResolvedValue({
            secrets: [{ secretKey: "K", secretValue: "V" }],
          });

          const testClient = new InfisicalClient(logger);
          const a = await testClient.getSecrets("env");
          const b = await testClient.getSecrets("env");
          expect(mockLogin).toHaveBeenCalledTimes(1);
          expect(a).toEqual({ K: "V" });
          expect(b).toEqual({ K: "V" });
        }
      );
    });
  });

  describe("when merging imported and base secrets", () => {
    it("should have base override imports and preserve import order", async () => {
      await withEnv(
        {
          INFISICAL_MACHINE_IDENTITY_CLIENT_ID: "id",
          INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET: "sec",
          INFISICAL_PROJECT_ID: "proj",
        },
        async () => {
          mockLogin.mockResolvedValue(undefined);
          mockListSecrets.mockResolvedValue({
            imports: [
              {
                secretPath: "a",
                secrets: [{ secretKey: "X", secretValue: "imp" }],
              },
              {
                secretPath: "b",
                secrets: [{ secretKey: "Y", secretValue: "imp2" }],
              },
            ],
            secrets: [
              { secretKey: "X", secretValue: "base" },
              { secretKey: "Z", secretValue: "baseZ" },
            ],
          });

          const testClient = new InfisicalClient(logger);
          const result = await testClient.getSecrets("env");
          expect(result).toEqual({ X: "base", Y: "imp2", Z: "baseZ" });
        }
      );
    });
  });

  describe("when Infisical environment is missing", () => {
    it("should surface environment-not-found via named error", async () => {
      await withEnv(
        {
          INFISICAL_MACHINE_IDENTITY_CLIENT_ID: "id",
          INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET: "sec",
          INFISICAL_PROJECT_ID: "proj",
        },
        async () => {
          mockLogin.mockResolvedValue(undefined);
          mockListSecrets.mockRejectedValue(
            new Error("Environment with slug 'nope' not found")
          );

          const testClient = new InfisicalClient(logger);
          await expect(testClient.getSecrets("nope")).rejects.toMatchObject({
            name: "EnvironmentNotFoundError",
          });
        }
      );
    });
  });

  describe("when credentials are missing or errors occur", () => {
    it("should reject when no credentials are available", async () => {
      await withEnv(
        {
          INFISICAL_MACHINE_IDENTITY_CLIENT_ID: undefined,
          INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET: undefined,
        },
        async () => {
          const testClient = new InfisicalClient(logger);
          await expect(testClient.getSecrets("any")).rejects.toThrow(
            /Not authenticated to Infisical/
          );
        }
      );
    });

    it("should rethrow non-environment-not-found errors", async () => {
      await withEnv(
        {
          INFISICAL_MACHINE_IDENTITY_CLIENT_ID: "id",
          INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET: "sec",
          INFISICAL_PROJECT_ID: "proj",
        },
        async () => {
          mockLogin.mockResolvedValue(undefined);
          mockListSecrets.mockRejectedValue(new Error("Network error"));
          const testClient = new InfisicalClient(logger);
          await expect(testClient.getSecrets("env")).rejects.toThrow(
            "Network error"
          );
        }
      );
    });
  });

  describe("when SDK initialization fails", () => {
    it("should handle constructor errors gracefully", async () => {
      const err = new Error("boom");
      mockInfisicalSDK.mockImplementationOnce(() => {
        throw err;
      });
      const { InfisicalClient: infisicalClientCtor } =
        await import("../../src/infisical-client");
      const c = new infisicalClientCtor(new Logger());
      await expect(c.getSecrets("env")).rejects.toThrow(/Not authenticated/);
    });
  });

  describe("when handling edge cases", () => {
    it("should throw when SDK construction fails silently", async () => {
      // SDK constructor throws, client should handle gracefully
      mockInfisicalSDK.mockImplementationOnce(() => {
        throw new Error("SDK init failed");
      });

      await withEnv(
        {
          INFISICAL_MACHINE_IDENTITY_CLIENT_ID: "id",
          INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET: "sec",
          INFISICAL_PROJECT_ID: "proj",
        },
        async () => {
          const testClient = new InfisicalClient(logger);
          await expect(testClient.getSecrets("env")).rejects.toThrow(
            /Not authenticated to Infisical/
          );
        }
      );
    });

    it("should reject when only partial credentials are provided", async () => {
      await withEnv(
        {
          INFISICAL_MACHINE_IDENTITY_CLIENT_ID: "id",
          INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET: undefined,
          INFISICAL_PROJECT_ID: undefined,
        },
        async () => {
          const testClient = new InfisicalClient(logger);
          await expect(testClient.getSecrets("env")).rejects.toThrow(
            /Not authenticated to Infisical/
          );
        }
      );
    });

    it("should surface authentication errors from login", async () => {
      await withEnv(
        {
          INFISICAL_MACHINE_IDENTITY_CLIENT_ID: "id",
          INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET: "sec",
          INFISICAL_PROJECT_ID: "proj",
        },
        async () => {
          mockLogin.mockRejectedValue(new Error("bad creds"));
          const testClient = new InfisicalClient(logger);
          await expect(testClient.getSecrets("env")).rejects.toThrow(
            /Authentication failed: bad creds/
          );
        }
      );
    });

    it("should reuse session after successful authentication", async () => {
      await withEnv(
        {
          INFISICAL_MACHINE_IDENTITY_CLIENT_ID: "id",
          INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET: "sec",
          INFISICAL_PROJECT_ID: "proj",
        },
        async () => {
          mockLogin.mockResolvedValue(undefined);
          mockListSecrets.mockResolvedValue({ secrets: [] });

          const testClient = new InfisicalClient(logger);
          await testClient.getSecrets("env");
          await testClient.getSecrets("env");
          // Login called only once, proving session is reused
          expect(mockLogin).toHaveBeenCalledTimes(1);
          expect(mockListSecrets).toHaveBeenCalledTimes(2);
        }
      );
    });

    it("should filter out invalid secret entries", async () => {
      await withEnv(
        {
          INFISICAL_MACHINE_IDENTITY_CLIENT_ID: "id",
          INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET: "sec",
          INFISICAL_PROJECT_ID: "proj",
        },
        async () => {
          mockLogin.mockResolvedValue(undefined);
          mockListSecrets.mockResolvedValue({
            imports: [
              {
                secretPath: "a",
                secrets: [
                  {},
                  { secretKey: " ", secretValue: "v" },
                ] as unknown[],
              },
            ],
            secrets: [
              { secretKey: "GOOD", secretValue: "ok" },
              { secretKey: "", secretValue: "no" } as unknown as {
                secretKey: string;
                secretValue: string;
              },
              { secretKey: "BAD", secretValue: "" } as unknown as {
                secretKey: string;
                secretValue: string;
              },
            ],
          });
          const testClient = new InfisicalClient(logger);
          const result = await testClient.getSecrets("env");
          expect(result).toEqual({ GOOD: "ok" });
        }
      );
    });
  });
});
