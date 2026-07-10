import { afterEach, describe, expect, it } from "bun:test";
import { generateText, resolveGatewayTarget } from "./gateway-driver";

describe("resolveGatewayTarget", () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
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

  it("tries another free model after a 429", async () => {
    process.env.OPENROUTER_API_KEY = "sk-or-test";
    process.env.AI_GATEWAY_URL =
      "https://gateway.ai.cloudflare.com/v1/account/gateway";
    process.env.LLM_MAX_MODEL_ATTEMPTS = "2";
    const requestedModels: string[] = [];

    globalThis.fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { model: string };
      requestedModels.push(body.model);

      if (requestedModels.length === 1) {
        return new Response(
          JSON.stringify({
            error: {
              message: "Provider returned error",
              metadata: { provider_name: "test", raw: "rate limited" },
            },
          }),
          { status: 429 },
        );
      }

      return Response.json({
        model: body.model,
        choices: [{ message: { content: "{\"ok\":true}" } }],
      });
    };

    const generated = await generateText({
      profileId: "judge",
      messages: [{ role: "user", content: "judge" }],
      validateText: (text) => {
        JSON.parse(text);
      },
    });

    expect(requestedModels).toHaveLength(2);
    expect(generated.model).toBe(requestedModels[1]);
    expect(generated.attemptedModels).toEqual(requestedModels);
  });

  it("tries another free model after malformed output", async () => {
    process.env.OPENROUTER_API_KEY = "sk-or-test";
    process.env.AI_GATEWAY_URL =
      "https://gateway.ai.cloudflare.com/v1/account/gateway";
    process.env.LLM_MAX_MODEL_ATTEMPTS = "2";
    let calls = 0;

    globalThis.fetch = async (_url, init) => {
      calls += 1;
      const body = JSON.parse(String(init?.body)) as { model: string };

      return Response.json({
        model: body.model,
        choices: [
          {
            message: {
              content: calls === 1 ? "not json" : "{\"ok\":true}",
            },
          },
        ],
      });
    };

    const generated = await generateText({
      profileId: "judge",
      messages: [{ role: "user", content: "judge" }],
      validateText: (text) => {
        JSON.parse(text);
      },
    });

    expect(calls).toBe(2);
    expect(generated.text).toBe("{\"ok\":true}");
  });

  it("tries another free model after async validation rejects", async () => {
    process.env.OPENROUTER_API_KEY = "sk-or-test";
    process.env.AI_GATEWAY_URL =
      "https://gateway.ai.cloudflare.com/v1/account/gateway";
    process.env.LLM_MAX_MODEL_ATTEMPTS = "2";
    let calls = 0;

    globalThis.fetch = async (_url, init) => {
      calls += 1;
      const body = JSON.parse(String(init?.body)) as { model: string };

      return Response.json({
        model: body.model,
        choices: [
          {
            message: {
              content: calls === 1 ? "async invalid" : "{\"ok\":true}",
            },
          },
        ],
      });
    };

    const generated = await generateText({
      profileId: "judge",
      messages: [{ role: "user", content: "judge" }],
      validateText: async (text) => {
        await Promise.resolve();
        JSON.parse(text);
      },
    });

    expect(calls).toBe(2);
    expect(generated.text).toBe("{\"ok\":true}");
  });
});
