import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveGatewayTarget } from "./gateway-driver";

describe("resolveGatewayTarget", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires Cloudflare AI Gateway", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
    vi.stubEnv("AI_GATEWAY_URL", "");

    expect(() => resolveGatewayTarget()).toThrow(/AI_GATEWAY_URL/);
  });

  it("routes OpenRouter through Cloudflare AI Gateway", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
    vi.stubEnv(
      "AI_GATEWAY_URL",
      "https://gateway.ai.cloudflare.com/v1/account/gateway",
    );
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "cf-test");

    const target = resolveGatewayTarget();

    expect(target.mode).toBe("cloudflare-gateway");
    expect(target.url).toBe(
      "https://gateway.ai.cloudflare.com/v1/account/gateway/openrouter/chat/completions",
    );
    expect(target.headers.Authorization).toBe("Bearer sk-or-test");
    expect(target.headers["cf-aig-authorization"]).toBe("Bearer cf-test");
  });
});
