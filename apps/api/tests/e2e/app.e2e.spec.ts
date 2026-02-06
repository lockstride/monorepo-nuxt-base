import supertest from "supertest";
import { describe, expect, it } from "vitest";
import { apiBaseUrl } from "./test-setup";

describe("API E2E", () => {
  it("GET /api should return Hello API", async () => {
    const res = await supertest(apiBaseUrl).get("/api");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Hello API" });
  });

  it("GET /api/health should return health status", async () => {
    const res = await supertest(apiBaseUrl).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status");
    expect(res.body).toHaveProperty("timestamp");
    expect(res.body.services).toHaveProperty("database");
    expect(res.body.services).toHaveProperty("api");
  });

  it("GET /api/hello-world should return hello world message", async () => {
    const res = await supertest(apiBaseUrl).get("/api/hello-world");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
  });
});
