import { describe, expect, it, vi } from "vitest";
import { HealthController } from "../../src/app/health/health.controller";
import { HealthService } from "../../src/app/health/health.service";
vi.mock("../../src/prisma.service", () => ({ PrismaService: class {} }));

describe("HealthController", () => {
  describe("when retrieving health", () => {
    it("should return health payload from service", async () => {
      // Given
      const payload = {
        status: "ok",
        services: { database: "healthy", api: "healthy" },
        timestamp: new Date().toISOString(),
      };
      const service = { getHealth: async () => payload } as const;
      const controller = new HealthController(service as HealthService);

      // When
      const result = await controller.getHealth();

      // Then
      expect(result).toEqual(payload);
    });
  });
});
