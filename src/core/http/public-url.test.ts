import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicBaseUrl } from "@/core/http/public-url";

describe("getPublicBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses APP_BASE_URL without a trailing slash", () => {
    vi.stubEnv("APP_BASE_URL", "https://steward.example/");
    expect(getPublicBaseUrl(new Request("http://localhost:10000/api/test"))).toBe("https://steward.example");
  });

  it("uses forwarded headers when APP_BASE_URL is absent", () => {
    vi.stubEnv("APP_BASE_URL", "");
    expect(getPublicBaseUrl(new Request("http://localhost:10000/api/test", {
      headers: { "x-forwarded-proto": "https", "x-forwarded-host": "steward.example" }
    }))).toBe("https://steward.example");
  });

  it("does not produce localhost in production", () => {
    vi.stubEnv("APP_BASE_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getPublicBaseUrl(new Request("http://localhost:10000/api/test"))).toThrow("Public base URL");
  });
});
