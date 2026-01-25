import type { Document } from "@nestjs/swagger";
import { describe, expect, it, vi } from "vitest";
import { configureApp, parseCorsOrigins } from "../../src/app/bootstrap";

describe("bootstrap helpers", () => {
  describe("parseCorsOrigins", () => {
    it("should return empty array when input is undefined or empty", () => {
      expect(parseCorsOrigins(undefined)).toEqual([]);
      expect(parseCorsOrigins("")).toEqual([]);
      expect(parseCorsOrigins(" , ")).toEqual([]);
    });

    it("should split, trim and filter origins", () => {
      const raw = " https://a.com , http://b.com,  ,https://c.com ";
      expect(parseCorsOrigins(raw)).toEqual([
        "https://a.com",
        "http://b.com",
        "https://c.com",
      ]);
    });
  });

  describe("configureApp", () => {
    it("should set prefix, set up swagger, and enable CORS when origins provided", async () => {
      const setGlobalPrefix = vi.fn();
      const enableCors = vi.fn();
      // Minimal mock of NestFastifyApplication
      const app = {
        setGlobalPrefix,
        enableCors,
        get: (_token: unknown) => ({
          get: vi.fn(() => "https://a.com,http://b.com"),
        }),
      };

      // Spy on SwaggerModule static methods
      const swagger = await import("@nestjs/swagger");
      const createDocumentSpy = vi
        .spyOn(swagger.SwaggerModule, "createDocument")
        .mockReturnValue({} as Document);
      const setupSpy = vi
        .spyOn(swagger.SwaggerModule, "setup")
        .mockImplementation(() => undefined);

      configureApp(app);

      expect(setGlobalPrefix).toHaveBeenCalledWith("api");
      expect(createDocumentSpy).toHaveBeenCalled();
      expect(setupSpy).toHaveBeenCalled();
      expect(enableCors).toHaveBeenCalledWith({
        origin: ["https://a.com", "http://b.com"],
        credentials: true,
      });
    });

    it("should not enable CORS when no origins provided", async () => {
      const setGlobalPrefix = vi.fn();
      const enableCors = vi.fn();
      const app = {
        setGlobalPrefix,
        enableCors,
        get: () => ({ get: vi.fn(() => undefined) }),
      };

      const swagger = await import("@nestjs/swagger");
      vi.spyOn(swagger.SwaggerModule, "createDocument").mockReturnValue(
        {} as Document
      );
      vi.spyOn(swagger.SwaggerModule, "setup").mockImplementation(
        () => undefined
      );

      configureApp(app);

      expect(setGlobalPrefix).toHaveBeenCalledWith("api");
      expect(enableCors).not.toHaveBeenCalled();
    });
  });
});
