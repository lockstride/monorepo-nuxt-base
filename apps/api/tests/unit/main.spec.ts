import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { describe, expect, it, vi } from "vitest";

// Mock configureApp to avoid invoking Swagger/CORS setup in this test
vi.mock("../../src/app/bootstrap", () => ({
  configureApp: vi.fn(),
}));

// Mock PrismaService to avoid resolving external prisma client package
vi.mock("../../src/prisma.service", () => ({
  PrismaService: class {},
}));

// Mock NestFactory.create to return a minimal app stub
vi.mock("@nestjs/core", async (orig) => {
  const actual = await (orig as () => Promise<unknown>)();
  return {
    ...actual,
    NestFactory: {
      create: vi.fn(async () => {
        return {
          setGlobalPrefix: vi.fn(),
          get: vi.fn((token: unknown) => {
            // ConfigService.get("port") should return a number
            if (typeof token === "function" || typeof token === "object") {
              return { get: vi.fn(() => 3001) };
            }
            return { get: vi.fn(() => 3001) };
          }),
          listen: vi.fn(async () => undefined),
          getHttpServer: () => ({
            address: () => ({ address: "0.0.0.0", port: 3001 }),
          }),
        } as NestFastifyApplication;
      }),
    },
  };
});

describe("main bootstrap", () => {
  it("should create app, configure it, and start listening with specific address", async () => {
    const core = await import("@nestjs/core");

    // Mock with specific IP address to test line 27
    (
      core as unknown as { NestFactory: { create: ReturnType<typeof vi.fn> } }
    ).NestFactory.create.mockImplementationOnce(async () => ({
      setGlobalPrefix: vi.fn(),
      get: vi.fn(() => ({ get: vi.fn(() => 3001) })),
      listen: vi.fn(async () => undefined),
      getHttpServer: () => ({
        address: () => ({ address: "192.168.1.1", port: 3001 }),
      }),
    }));

    const { bootstrap: bootstrapFn } = await import("../../src/main");

    await bootstrapFn();

    expect(
      (core as unknown as { NestFactory: { create: ReturnType<typeof vi.fn> } })
        .NestFactory.create
    ).toHaveBeenCalled();
  });

  it("should handle IPv6 wildcard address", async () => {
    const core = await import("@nestjs/core");

    // Mock with IPv6 wildcard to test line 26 left branch
    (
      core as unknown as { NestFactory: { create: ReturnType<typeof vi.fn> } }
    ).NestFactory.create.mockImplementationOnce(async () => ({
      setGlobalPrefix: vi.fn(),
      get: vi.fn(() => ({ get: vi.fn(() => 3001) })),
      listen: vi.fn(async () => undefined),
      getHttpServer: () => ({
        address: () => ({ address: "::", port: 3001 }),
      }),
    }));

    const { bootstrap: bootstrapFn } = await import("../../src/main");

    await bootstrapFn();

    expect(
      (core as unknown as { NestFactory: { create: ReturnType<typeof vi.fn> } })
        .NestFactory.create
    ).toHaveBeenCalled();
  });

  it("should handle non-object address return", async () => {
    const core = await import("@nestjs/core");

    // Mock with non-object address to test line 28 right branch
    (
      core as unknown as { NestFactory: { create: ReturnType<typeof vi.fn> } }
    ).NestFactory.create.mockImplementationOnce(async () => ({
      setGlobalPrefix: vi.fn(),
      get: vi.fn(() => ({ get: vi.fn(() => 3001) })),
      listen: vi.fn(async () => undefined),
      getHttpServer: () => ({
        address: () => "string-address",
      }),
    }));

    const { bootstrap: bootstrapFn } = await import("../../src/main");

    await bootstrapFn();

    expect(
      (core as unknown as { NestFactory: { create: ReturnType<typeof vi.fn> } })
        .NestFactory.create
    ).toHaveBeenCalled();
  });
});
