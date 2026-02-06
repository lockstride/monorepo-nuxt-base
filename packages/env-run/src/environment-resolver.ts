import { existsSync, readFileSync } from "node:fs";
import { EnvParser, parseEnvContent } from "./env-parser.js";
import { InfisicalClient } from "./infisical-client.js";
import { Logger } from "./logger.js";

export interface EnvironmentSourceData {
  processEnv: Record<string, string>;
  baseEnv: Record<string, string>;
  overrideEnv: Record<string, string>;
  infisicalSecrets: Record<string, string>;
  cliOverrides: Record<string, string>;
}

export interface EnvironmentResolutionResult {
  finalEnv: Record<string, string>;
  sourceData: EnvironmentSourceData;
  usedInfisical: boolean;
  filePaths: {
    baseEnvFile: string | null;
    overrideEnvFile: string | null;
  };
}

export class EnvironmentResolver {
  private envParser: EnvParser;
  private infisicalClient: InfisicalClient;
  private logger: Logger;

  constructor(monorepoRoot: string, logger?: Logger) {
    this.logger = logger || new Logger();
    this.envParser = new EnvParser(monorepoRoot);
    this.infisicalClient = new InfisicalClient(this.logger);
  }

  private parseCliOverrides(cliOverrides?: string[]): Record<string, string> {
    if (!cliOverrides || cliOverrides.length === 0) {
      return {};
    }

    const result: Record<string, string> = {};
    for (const override of cliOverrides) {
      const [key, ...valueParts] = override.split("=");
      if (key && valueParts.length > 0) {
        result[key] = valueParts.join("=");
      }
    }
    return result;
  }

  async resolveEnvironment(
    envName?: string,
    forceRefresh = false,
    cliOverrides?: string[]
  ): Promise<EnvironmentResolutionResult> {
    if (envName) {
      this.envParser.setEnvName(envName);
    }

    // Determine if we should use Infisical
    // Don't use Infisical if no environment name is provided
    let useInfisical = envName
      ? this.envParser.shouldUseInfisical(forceRefresh)
      : false;
    if (forceRefresh && envName) {
      useInfisical = true;
    }

    const sourceData: EnvironmentSourceData = {
      processEnv: {},
      baseEnv: {},
      overrideEnv: {},
      infisicalSecrets: {},
      cliOverrides: this.parseCliOverrides(cliOverrides),
    };

    // Load base .env file
    const baseEnvPath = this.envParser.getBaseEnvFile();
    if (baseEnvPath && existsSync(baseEnvPath)) {
      const content = readFileSync(baseEnvPath, "utf-8");
      sourceData.baseEnv = parseEnvContent(content);
    }

    // Load environment-specific .env file
    const overrideEnvPath = this.envParser.getOverrideEnvFile();
    if (overrideEnvPath && existsSync(overrideEnvPath)) {
      const content = readFileSync(overrideEnvPath, "utf-8");
      sourceData.overrideEnv = parseEnvContent(content);
    }

    // Filter process environment to exclude variables from env files
    sourceData.processEnv = this.filterProcessEnv(
      sourceData.baseEnv,
      sourceData.overrideEnv
    );

    let actualUsedInfisical = false;

    // Log if no environment-specific file was found (always log this when we have an envName)
    if (envName && (!overrideEnvPath || !existsSync(overrideEnvPath))) {
      /* v8 ignore next: pure logging branch -- @preserve */
      this.logger.info(`No environment-specific file found for: ${envName}`);
    }

    // Try to get secrets from Infisical if configured
    if (useInfisical) {
      try {
        sourceData.infisicalSecrets =
          await this.infisicalClient.getSecrets(envName);
        actualUsedInfisical = true;

        /* v8 ignore next 5: envName is always truthy here - useInfisical requires envName (line 61-66) -- @preserve */
        if (envName) {
          this.envParser.writeEnvironmentFile(sourceData.infisicalSecrets);
          this.logger.info(
            `Infisical retrieval successful. Wrote ${Object.keys(sourceData.infisicalSecrets).length} secrets to .env.${envName}`
          );
        }
      } catch (error) {
        // Check if this is an environment not found error
        if ((error as Error).name === "EnvironmentNotFoundError") {
          // Log the appropriate messages for environment not found
          this.logger.warn(
            `No environment-specific Infisical slug for: ${envName}`
          );
          this.logger.info(`Using .env and process environment`);
          actualUsedInfisical = false;
        } else if (this.envParser.hasInfisicalCredentials()) {
          // If credentials are present but authentication failed (not env not found),
          // this is an exceptional case that should fail hard rather than falling back
          throw error; // Re-throw to fail hard - let the top-level handler log the error
        } else {
          // If no credentials are present, fall back gracefully
          // Note: InfisicalClient already logged the helpful message
          /* v8 ignore next: pure logging branch -- @preserve */
          this.logger.info(`Using .env and process environment`);
          actualUsedInfisical = false;
        }
      }
    } else if (envName) {
      /* v8 ignore start: logging-only info path when envName is provided without override -- @preserve */
      // If we have an envName but Infisical is not configured
      // Only log fallback message if no environment-specific file was found
      if (!overrideEnvPath || !existsSync(overrideEnvPath)) {
        /* v8 ignore next: pure logging branch -- @preserve */
        if (!this.envParser.hasInfisicalCredentials()) {
          this.logger.info("No Infisical credentials available");
        }
        /* v8 ignore next: pure logging branch -- @preserve */
        this.logger.info(`Using .env and process environment`);
      }
    }
    /* v8 ignore end -- @preserve */

    // Build final environment with correct precedence
    const finalEnv = this.buildFinalEnvironment(sourceData);

    return {
      finalEnv,
      sourceData,
      usedInfisical: actualUsedInfisical,
      filePaths: {
        baseEnvFile: this.envParser.getBaseEnvFile(),
        overrideEnvFile: this.envParser.getOverrideEnvFile(),
      },
    };
  }

  filterProcessEnv(
    baseEnv: Record<string, string>,
    overrideEnv: Record<string, string>
  ): Record<string, string> {
    const envFileKeys = new Set([
      ...Object.keys(baseEnv || {}),
      ...Object.keys(overrideEnv || {}),
    ]);

    const filteredProcessEnv: Record<string, string> = {};
    for (const key in process.env) {
      if (!envFileKeys.has(key) && process.env[key] !== undefined) {
        filteredProcessEnv[key] = process.env[key] as string;
      }
    }

    return filteredProcessEnv;
  }

  private buildFinalEnvironment(
    sourceData: EnvironmentSourceData
  ): Record<string, string> {
    // Start with a clean slate to ensure correct precedence
    const finalEnv: Record<string, string> = {};

    // Apply sources in ascending order of precedence:
    // 1. Process environment (lowest)
    Object.assign(finalEnv, sourceData.processEnv);
    // 2. Base .env file
    Object.assign(finalEnv, sourceData.baseEnv);
    // 3. Environment-specific .env file
    Object.assign(finalEnv, sourceData.overrideEnv);
    // 4. Infisical secrets
    Object.assign(finalEnv, sourceData.infisicalSecrets);
    // 5. CLI overrides (highest precedence)
    Object.assign(finalEnv, sourceData.cliOverrides);

    return finalEnv;
  }
}
