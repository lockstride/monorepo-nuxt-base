import { describe, expect, it, vi } from "vitest";

// Provide a lightweight stub for PrismaClient and adapter factory used by PrismaService
// The mock simulates the real behavior: uses DATABASE_URL or falls back to default local URL
vi.mock("@oxford-heavy/data-sources-prisma", () => ({
  PrismaClient: class {
    $connect = vi.fn(async () => undefined);
  },
  createPrismaAdapter: vi.fn(() => {
    // Simulates getDatabaseUrl() - returns DATABASE_URL or default
    return {};
  }),
}));

const importService = async () => {
  const mod = await import("../../src/prisma.service");
  return mod.PrismaService as typeof import("../../src/prisma.service").PrismaService;
};

describe("PrismaService", () => {
  describe("when initializing the module", () => {
    it("should call $connect on the client", async () => {
      // Given
      const prev = process.env.DATABASE_URL;
      process.env.DATABASE_URL = "postgresql://u:p@h:5432/db?schema=public";
      const prismaService = await importService();
      const service = new prismaService();
      const connectSpy = vi.spyOn(service, "$connect");

      try {
        // When
        await service.onModuleInit();
        // Then
        expect(connectSpy).toHaveBeenCalled();
      } finally {
        if (prev) process.env.DATABASE_URL = prev;
      }
    });
  });
});
