import { describe, expect, it } from "vitest";
import configuration from "../../src/app/config/configuration";

describe("configuration factory", () => {
  describe("when environment variables are provided", () => {
    it("should parse and map env into config object", () => {
      // Given
      const prev = { ...process.env };
      process.env.API_PORT = "4000";
      process.env.DATABASE_URL =
        "postgresql://user:pw@host:5432/db?schema=public";
      process.env.CORS_ORIGINS = "https://a.com, http://b.com";

      try {
        // When
        const config = configuration();

        // Then
        expect(config.port).toBe(4000);
        expect(config.database.url).toBe(
          "postgresql://user:pw@host:5432/db?schema=public"
        );
        expect(config.cors.origins).toBe("https://a.com, http://b.com");
      } finally {
        process.env = prev;
      }
    });
  });

  describe("when environment variables are not provided", () => {
    it("should apply sensible defaults", () => {
      // Given
      const prev = { ...process.env };
      delete process.env.API_PORT;
      delete process.env.PORT;
      delete process.env.DATABASE_URL;
      delete process.env.CORS_ORIGINS;

      try {
        // When
        const config = configuration();

        // Then
        expect(config.port).toBe(3001);
        expect(config.database.url).toContain("postgresql://");
      } finally {
        process.env = prev;
      }
    });
  });
});
