#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DebugRenderer } from "./debug-renderer.js";
import { parseEnvContent } from "./env-parser.js";
import {
  EnvironmentResolver,
  type EnvironmentResolutionResult,
} from "./environment-resolver.js";
import { InfisicalClient } from "./infisical-client.js";
import { Logger } from "./logger.js";

export interface ParsedArgs {
  env?: string;
  forceRefresh?: boolean;
  debug?: boolean;
  help?: boolean;
  overrides?: string[];
  command: string[];
}

export function findMonorepoRoot(startDir: string): string {
  let currentDir = startDir;
  while (true) {
    if (existsSync(join(currentDir, "pnpm-workspace.yaml"))) {
      return currentDir;
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      throw new Error(
        "Could not find monorepo root containing pnpm-workspace.yaml"
      );
    }
    currentDir = parentDir;
  }
}

export function parseOverrides(overridesString: string): string[] {
  if (!overridesString || overridesString.trim() === "") {
    return [];
  }

  let trimmed = overridesString.trim();

  // Handle bracket notation: [KEY=value, KEY2=value2]
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    trimmed = trimmed.slice(1, -1).trim();

    // Handle empty brackets
    if (trimmed === "") {
      return [];
    }
  }

  // Split by comma and trim each part
  return trimmed
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export class EnvRun {
  private envName?: string;
  private forceRefresh: boolean;
  private debug: boolean;
  private command: string[];
  private cliOverrides?: string[];
  private environmentResolver: EnvironmentResolver;
  private infisicalClient: InfisicalClient;
  private debugRenderer: DebugRenderer;
  private logger: Logger;
  private monorepoRoot: string;

  constructor(args: ParsedArgs) {
    this.envName = args.env;
    this.forceRefresh = args.forceRefresh || false;
    this.debug = args.debug || false;
    this.command = args.command;
    this.cliOverrides = args.overrides;

    this.logger = new Logger(this.debug);
    this.monorepoRoot = findMonorepoRoot(
      dirname(fileURLToPath(import.meta.url))
    );
    this.environmentResolver = new EnvironmentResolver(
      this.monorepoRoot,
      this.logger
    );
    this.infisicalClient = new InfisicalClient(this.logger);
    this.debugRenderer = new DebugRenderer(this.logger);
  }

  private loadInfisicalCredentials(): void {
    // Only load .env if credentials are not already in the process
    if (
      !process.env.INFISICAL_MACHINE_IDENTITY_CLIENT_ID ||
      !process.env.INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET ||
      !process.env.INFISICAL_PROJECT_ID
    ) {
      const envPath = join(this.monorepoRoot, ".env");
      if (existsSync(envPath)) {
        const content = readFileSync(envPath, "utf-8");
        const parsed = parseEnvContent(content);
        if (parsed.INFISICAL_MACHINE_IDENTITY_CLIENT_ID) {
          process.env.INFISICAL_MACHINE_IDENTITY_CLIENT_ID =
            parsed.INFISICAL_MACHINE_IDENTITY_CLIENT_ID;
        }
        if (parsed.INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET) {
          process.env.INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET =
            parsed.INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET;
        }
        if (parsed.INFISICAL_PROJECT_ID) {
          process.env.INFISICAL_PROJECT_ID = parsed.INFISICAL_PROJECT_ID;
        }
        if (parsed.INFISICAL_SITE_URL) {
          process.env.INFISICAL_SITE_URL = parsed.INFISICAL_SITE_URL;
        }
      }
    }
  }

  async run(): Promise<void> {
    try {
      // Check if we're running in CI environment (GitHub Actions)
      const isCI = process.env.GITHUB_ACTIONS === "true";

      if (isCI) {
        // CI mode: bypass all environment resolution and use process.env directly
        this.logger.info("CI environment detected (GITHUB_ACTIONS=true)");
        this.logger.info(
          "Bypassing environment resolution and using process environment directly"
        );

        // Only execute command if one was provided
        if (this.command.length > 0) {
          await this.executeCommand(process.env as Record<string, string>);
        }
        return;
      }

      // Normal mode: use full environment resolution
      this.loadInfisicalCredentials();

      // Use the new EnvironmentResolver to get all environment data in one place
      const resolutionResult =
        await this.environmentResolver.resolveEnvironment(
          this.envName,
          this.forceRefresh,
          this.cliOverrides
        );

      this.showSourcingMessage(resolutionResult);

      if (this.debug) {
        await this.renderDebugInfo(resolutionResult);
      }

      // Only execute command if one was provided
      if (this.command.length > 0) {
        await this.executeCommand(resolutionResult.finalEnv);
      }
    } catch (error) {
      /* v8 ignore next: log-only -- @preserve */
      this.logger.error(`${(error as Error).message}`);
      if (process.env.NODE_ENV !== "test") {
        process.exit(1);
      }
      throw error; // Re-throw for tests
    }
  }

  private showSourcingMessage(
    resolutionResult: EnvironmentResolutionResult
  ): void {
    if (this.envName) {
      const overrideFile = resolutionResult.filePaths.overrideEnvFile;

      if (this.forceRefresh) {
        this.logger.info(
          `Force refresh enabled for environment: ${this.envName}`
        );
        this.logger.info(
          `Will fetch fresh secrets from Infisical and overwrite existing environment file`
        );
      } else if (overrideFile) {
        // Show as {root_dir_name}/.env.{environment} format
        const rootDirName = basename(this.monorepoRoot);
        const fileName = basename(overrideFile);
        this.logger.info(
          `Using environment-specific file: ${rootDirName}/${fileName}`
        );
        this.logger.debug(`No Infisical login attempted - using local file`);
      } else {
        // All messaging is now handled naturally in EnvironmentResolver
        // No additional messages needed here
      }
    } else {
      this.logger.info(`Using .env and process environment`);
    }
  }

  private async executeCommand(env: Record<string, string>): Promise<void> {
    const [command, ...args] = this.command;

    if (this.debug) {
      this.logger.debug(`Executing: ${command} ${args.join(" ")}`);
    }

    const child = spawn(command, args, {
      stdio: "inherit",
      cwd: process.cwd(),
      env,
    });

    return new Promise((resolve, reject) => {
      child.on("exit", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command exited with code ${code}`));
        }
      });

      child.on("error", (error) => {
        reject(error);
      });
    });
  }

  private async renderDebugInfo(
    resolutionResult: EnvironmentResolutionResult
  ): Promise<void> {
    // Convert EnvironmentResolutionResult to DebugData format
    const debugData = {
      processEnv: resolutionResult.sourceData.processEnv,
      baseEnv: resolutionResult.sourceData.baseEnv,
      overrideEnv: resolutionResult.sourceData.overrideEnv,
      infisicalSecrets: resolutionResult.sourceData.infisicalSecrets,
      cliOverrides: resolutionResult.sourceData.cliOverrides,
      finalEnv: resolutionResult.finalEnv,
    };

    /* v8 ignore next: log/print side effect -- @preserve */
    this.debugRenderer.print(debugData, this.envName);
  }
}

// Parse command line arguments
export function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const result: ParsedArgs = {
    command: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--env" && i + 1 < args.length) {
      result.env = args[++i];
    } else if (arg.startsWith("--env=")) {
      result.env = arg.substring(6); // Remove "--env=" prefix
    } else if (arg === "--overrides" && i + 1 < args.length) {
      result.overrides = parseOverrides(args[++i]);
    } else if (arg.startsWith("--overrides=")) {
      result.overrides = parseOverrides(arg.substring(12)); // Remove "--overrides=" prefix
    } else if (arg === "--force-refresh") {
      result.forceRefresh = true;
    } else if (arg === "--debug") {
      result.debug = true;
    } else if (arg === "--help") {
      result.help = true;
    } else if (arg === "--") {
      result.command = args.slice(i + 1);
      break;
    } else if (!arg.startsWith("-")) {
      // If no -- separator found, treat remaining args as command
      result.command = args.slice(i);
      break;
    }
  }
  return result;
}
