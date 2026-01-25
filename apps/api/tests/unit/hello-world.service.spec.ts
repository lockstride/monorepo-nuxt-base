import { describe, expect, it, vi } from "vitest";
import { HelloWorldService } from "../../src/app/hello-world/hello-world.service";
import { PrismaService } from "../../src/prisma.service";
import {
  createPrismaMock,
  prismaWithHelloWorldMessage,
} from "../helpers/prisma-mocks";
// Mock PrismaService module to avoid importing Prisma Client in unit tests
vi.mock("../../src/prisma.service", () => ({ PrismaService: class {} }));

describe("HelloWorldService", () => {
  describe("when a message exists", () => {
    it("should return the stored message", async () => {
      // Given
      const service = new HelloWorldService(
        prismaWithHelloWorldMessage({
          message: "Hello from DB",
        }) as PrismaService
      );
      // When
      const result = await service.getMessage();
      // Then
      expect(result).toEqual({ message: "Hello from DB" });
    });
  });

  describe("when no message exists", () => {
    it("should return the default no-message response", async () => {
      // Given
      const service = new HelloWorldService(
        createPrismaMock() as PrismaService
      );
      // When
      const result = await service.getMessage();
      // Then
      expect(result).toEqual({ message: "No message found in database." });
    });
  });
});
