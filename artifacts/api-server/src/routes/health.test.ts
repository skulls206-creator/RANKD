import { describe, it, expect } from "vitest";
import { HealthCheckResponse } from "@workspace/api-zod";

describe("GET /healthz", () => {
  it("validates HealthCheckResponse schema", () => {
    const result = HealthCheckResponse.parse({ status: "ok" });
    expect(result.status).toBe("ok");
  });

  it("rejects invalid health response", () => {
    expect(() => HealthCheckResponse.parse({})).toThrow();
  });
});
