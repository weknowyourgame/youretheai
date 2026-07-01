import { afterEach, describe, expect, it } from "bun:test";
import { resolveGatewayTarget } from "./gateway-driver";

describe("resolveGatewayTarget", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("requires Cloudflare AI Gateway", () => {
    process.env.OPENROUTER_API_KEY = "sk-or-test";
    process.env.AI_GATEWAY_URL = "";

    expect(() => resolveGatewayTarget()).toThrow(/AI_GATEWAY_URL/);
  });

  it("routes OpenRouter through Cloudflare AI Gateway", () => {
    process.env.OPENROUTER_API_KEY = "sk-or-test";
    process.env.AI_GATEWAY_URL =
      "https://gateway.ai.cloudflare.com/v1/account/gateway";
    process.env.CLOUDFLARE_API_TOKEN = "cf-test";

    const target = resolveGatewayTarget();

    expect(target.mode).toBe("cloudflare-gateway");
    expect(target.url).toBe(
      "https://gateway.ai.cloudflare.com/v1/account/gateway/openrouter/chat/completions",
    );
    expect(target.headers.Authorization).toBe("Bearer sk-or-test");
    expect(target.headers["cf-aig-authorization"]).toBe("Bearer cf-test");
  });
});
