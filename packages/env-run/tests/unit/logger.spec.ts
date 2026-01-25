import { describe, it } from "vitest";
import { Logger } from "../../src/logger";

describe("Logger", () => {
  describe("when debug is enabled", () => {
    it("should log info/warn/error and debug messages", () => {
      const logger = new Logger(true);
      logger.info("i");
      logger.warn("w");
      logger.error("e");
      logger.debug("d");
    });
  });

  describe("when debug is disabled", () => {
    it("should not log debug messages", () => {
      const original = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = "production";
        const logger = new Logger(false);
        logger.debug("d");
      } finally {
        process.env.NODE_ENV = original;
      }
    });
  });
});
