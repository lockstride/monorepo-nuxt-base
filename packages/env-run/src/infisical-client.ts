import { InfisicalSDK } from "@infisical/sdk";
import { Logger } from "./logger.js";

export interface Secret {
  secretKey: string;
  secretValue: string;
}

export class InfisicalClient {
  private sdk: InfisicalSDK | null = null;
  private isAuthenticated = false;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.initializeSDK();
  }

  private initializeSDK(): void {
    try {
      this.sdk = new InfisicalSDK({
        siteUrl: process.env.INFISICAL_SITE_URL || "https://app.infisical.com",
      });
    } catch (error) {
      this.logger.error(
        `Failed to initialize Infisical SDK: ${(error as Error).message}`
      );
      this.sdk = null;
    }
  }

  static hasInfisicalCredentials(): boolean {
    const clientId = process.env.INFISICAL_MACHINE_IDENTITY_CLIENT_ID;
    const clientSecret = process.env.INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET;

    // Check if both credentials are available and not placeholder values
    return !!(
      clientId &&
      clientSecret &&
      clientId.trim() !== "" &&
      clientSecret.trim() !== "" &&
      clientId !== "YOUR_INFISICAL_CLIENT_ID" &&
      clientSecret !== "YOUR_INFISICAL_CLIENT_SECRET" &&
      !clientId.startsWith("${") &&
      !clientSecret.startsWith("${")
    );
  }

  private async authenticate(): Promise<boolean> {
    // If already authenticated, return true
    /* v8 ignore start -- @preserve */
    if (this.isAuthenticated) {
      return true;
    }
    /* v8 ignore stop -- @preserve */

    if (!this.sdk) {
      /* v8 ignore next -- @preserve */
      this.logger.error("No SDK available for authentication");
      return false;
    }

    // Check for Universal Auth credentials
    if (InfisicalClient.hasInfisicalCredentials()) {
      try {
        const clientId = process.env.INFISICAL_MACHINE_IDENTITY_CLIENT_ID;
        const clientSecret =
          process.env.INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET;

        /* v8 ignore start: unreachable due to hasInfisicalCredentials pre-check -- @preserve */
        if (!clientId || !clientSecret) {
          this.logger.error("Missing required credentials");
          return false;
        }
        /* v8 ignore end -- @preserve */

        await this.sdk.auth().universalAuth.login({
          clientId,
          clientSecret,
        });
        this.isAuthenticated = true;
        this.logger.debug("Infisical authentication successful");
        return true;
      } catch (error) {
        // The caller will handle logging this error.
        throw new Error(`Authentication failed: ${(error as Error).message}`);
      }
    }

    // No authentication method available
    /* v8 ignore next -- @preserve */
    this.logger.info("No Infisical credentials available");
    return false;
  }

  async getSecrets(envName?: string): Promise<Record<string, string>> {
    // Authenticate automatically if not already authenticated
    if (!this.isAuthenticated) {
      const authResult = await this.authenticate();
      if (!authResult) {
        throw new Error("Not authenticated to Infisical");
      }
    }

    if (!this.sdk) {
      /* v8 ignore next: defensive check when SDK construction failed -- @preserve */
      throw new Error("Not authenticated to Infisical");
    }

    try {
      const response = await this.sdk.secrets().listSecrets({
        environment: envName,
        projectId: process.env.INFISICAL_PROJECT_ID,
        includeImports: true,
        recursive: true,
      });

      // Convert the response and return it as before
      return this.convertSecretsResponse(response);
    } catch (error) {
      // Check if this is an environment not found error (404)
      const errorMessage = (error as Error).message;
      if (
        errorMessage.includes("Environment with slug") &&
        errorMessage.includes("not found")
      ) {
        // Log the error details immediately when they occur
        /* v8 ignore next: debug log only -- @preserve */
        this.logger.debug(errorMessage);

        // Create a specific error type for environment not found
        const envNotFoundError = new Error(errorMessage);
        envNotFoundError.name = "EnvironmentNotFoundError";
        throw envNotFoundError;
      }

      // For all other errors, re-throw as is
      throw error;
    }
  }

  private convertSecretsResponse(response: {
    secrets?: Array<{ secretKey: string; secretValue: string }>;
    imports?: Array<{
      secretPath: string;
      secrets: Array<{ secretKey: string; secretValue: string }>;
    }>;
  }): Record<string, string> {
    // Convert the SDK response to a simple key-value object
    const result: Record<string, string> = {};

    // Helper to extract secrets from an array and add to result
    function addSecretsToResult(
      secrets: unknown,
      result: Record<string, string>
    ) {
      if (Array.isArray(secrets)) {
        for (const secret of secrets) {
          if (
            secret &&
            typeof secret === "object" &&
            "secretKey" in secret &&
            "secretValue" in secret &&
            typeof (secret as Record<string, unknown>).secretKey === "string" &&
            typeof (secret as Record<string, unknown>).secretValue ===
              "string" &&
            (secret as Record<string, string>).secretKey.trim() !== "" &&
            (secret as Record<string, string>).secretValue.trim() !== ""
          ) {
            result[(secret as Record<string, string>).secretKey] = (
              secret as Record<string, string>
            ).secretValue;
          }
        }
      }
    }

    // Handle imported secrets first (lower precedence)
    if (response.imports && Array.isArray(response.imports)) {
      for (const importObj of response.imports) {
        addSecretsToResult(importObj.secrets, result);
      }
    }

    // Handle base secrets last (higher precedence)
    addSecretsToResult(response.secrets, result);

    return result;
  }
}
