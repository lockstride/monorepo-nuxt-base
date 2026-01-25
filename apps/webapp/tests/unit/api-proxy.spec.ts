import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { H3Event } from "h3";

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    getRequestURL: vi.fn(),
    proxyRequest: vi.fn(),
  };
});

import handler from "../../server/middleware/api-proxy";
import { getRequestURL, proxyRequest } from "h3";

describe("api-proxy middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.INTEROP_API_DOMAIN;
    delete process.env.INTEROP_API_PORT;
  });

  describe("when request path does not start with /api/", () => {
    it("should return undefined and not proxy the request", async () => {
      // Given
      const mockEvent = {} as H3Event;
      (getRequestURL as Mock).mockReturnValue(
        new URL("http://localhost:3000/other/path")
      );

      // When
      const result = await handler(mockEvent);

      // Then
      expect(result).toBeUndefined();
      expect(proxyRequest).not.toHaveBeenCalled();
    });
  });

  describe("when request path starts with /api/", () => {
    it("should proxy to default API domain and port", async () => {
      // Given
      const mockEvent = {} as H3Event;
      (getRequestURL as Mock).mockReturnValue(
        new URL("http://localhost:3000/api/hello-world")
      );
      (proxyRequest as Mock).mockResolvedValue({ data: "proxied" });

      // When
      const result = await handler(mockEvent);

      // Then
      expect(proxyRequest).toHaveBeenCalledWith(
        mockEvent,
        "http://127.0.0.1:3001/api/hello-world"
      );
      expect(result).toEqual({ data: "proxied" });
    });

    it("should use custom INTEROP_API_DOMAIN from environment", async () => {
      // Given
      process.env.INTEROP_API_DOMAIN = "http://custom-api";
      const mockEvent = {} as H3Event;
      (getRequestURL as Mock).mockReturnValue(
        new URL("http://localhost:3000/api/users")
      );
      (proxyRequest as Mock).mockResolvedValue({ users: [] });

      // When
      await handler(mockEvent);

      // Then
      expect(proxyRequest).toHaveBeenCalledWith(
        mockEvent,
        "http://custom-api:3001/api/users"
      );
    });

    it("should use custom INTEROP_API_PORT from environment", async () => {
      // Given
      process.env.INTEROP_API_PORT = "8080";
      const mockEvent = {} as H3Event;
      (getRequestURL as Mock).mockReturnValue(
        new URL("http://localhost:3000/api/data")
      );
      (proxyRequest as Mock).mockResolvedValue({ data: "test" });

      // When
      await handler(mockEvent);

      // Then
      expect(proxyRequest).toHaveBeenCalledWith(
        mockEvent,
        "http://127.0.0.1:8080/api/data"
      );
    });

    it("should preserve query parameters in proxied URL", async () => {
      // Given
      const mockEvent = {} as H3Event;
      (getRequestURL as Mock).mockReturnValue(
        new URL("http://localhost:3000/api/search?q=test&limit=10")
      );
      (proxyRequest as Mock).mockResolvedValue({ results: [] });

      // When
      await handler(mockEvent);

      // Then
      expect(proxyRequest).toHaveBeenCalledWith(
        mockEvent,
        "http://127.0.0.1:3001/api/search?q=test&limit=10"
      );
    });
  });
});
