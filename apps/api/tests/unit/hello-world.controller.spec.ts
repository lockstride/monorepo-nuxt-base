import { describe, expect, it, vi } from "vitest";
import { HelloWorldController } from "../../src/app/hello-world/hello-world.controller";
import { HelloWorldService } from "../../src/app/hello-world/hello-world.service";
vi.mock("../../src/prisma.service", () => ({ PrismaService: class {} }));

describe("HelloWorldController", () => {
  describe("when getting the message", () => {
    it("should return message from service", async () => {
      // Given
      const msg = { message: "Hi" };
      const service = { getMessage: async () => msg } as const;
      const controller = new HelloWorldController(service as HelloWorldService);

      // When
      const result = await controller.getMessage();

      // Then
      expect(result).toEqual(msg);
    });
  });
});
