/**
 * CLI entry point for env-run
 *
 * This file contains the main() function and CLI bootstrap logic.
 * It's tested via E2E tests, not unit tests.
 */
import { realpathSync } from "node:fs";
import { EnvRun, parseArgs } from "./index.js";
import { Logger } from "./logger.js";
import { helpText } from "./help-text.js";

async function main(): Promise<void> {
  const args = parseArgs();
  const logger = new Logger(args.debug);

  if (args.help || (args.command.length === 0 && !args.forceRefresh)) {
    logger.info(`\n${helpText}`);
    process.exit(0);
  }

  const app = new EnvRun(args);
  await app.run();
}

// Main execution for ES modules
// Only run main if this file is being executed directly
const isMain = import.meta.url === `file://${realpathSync(process.argv[1])}`;
if (isMain) {
  main().catch((error) => {
    const logger = new Logger();
    logger.error(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}
