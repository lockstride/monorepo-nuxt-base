import { describe, expect, it, vi } from "vitest";
import { HealthService } from "../../src/app/health/health.service";
import { PrismaService } from "../../src/prisma.service";
import {
  prismaWithHealthyDb,
  prismaWithUnhealthyDb,
} from "../helpers/prisma-mocks";
vi.mock("../../src/prisma.service", () => ({ PrismaService: class {} }));

describe("HealthService", () => {
  describe("when the database is healthy", () => {
    it("should return ok status and mark services healthy", async () => {
      // Given
      const service = new HealthService(prismaWithHealthyDb() as PrismaService);
      // When
      const result = await service.getHealth();
      // Then
      expect(result.status).toBe("ok");
      expect(result.services).toEqual({ database: "healthy", api: "healthy" });
      expect(typeof result.timestamp).toBe("string");
    });
  });

  describe("when the database throws an error", () => {
    it("should return error status and mark database unhealthy", async () => {
      // Given
      const service = new HealthService(
        prismaWithUnhealthyDb() as PrismaService
      );
      // When
      const result = await service.getHealth();
      // Then
      expect(result.status).toBe("error");
      expect(result.services).toEqual({
        database: "unhealthy",
        api: "healthy",
      });
      expect(typeof result.timestamp).toBe("string");
      expect(result).toHaveProperty("error");
    });
  });
});
