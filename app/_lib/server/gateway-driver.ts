import { modelProfiles, type ModelProfileId } from "./model-config";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type GatewayRequest = {
  profileId: ModelProfileId;
  messages: ChatMessage[];
  temperature?: number;
  timeoutMs?: number;
};

type GatewayResponse = {
  text: string;
  model: string;
};

export function resolveGatewayTarget() {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const gatewayBase = (process.env.AI_GATEWAY_URL ?? "").replace(/\/$/, "");

  if (!openRouterKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  if (!gatewayBase) {
    throw new Error(
      "AI_GATEWAY_URL is not configured. Prompt Panic only calls OpenRouter through Cloudflare AI Gateway.",
    );
  }

  const cloudflareToken = process.env.CLOUDFLARE_API_TOKEN;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${openRouterKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.OPENROUTER_REFERER ?? "http://localhost:3000",
    "X-OpenRouter-Title": process.env.OPENROUTER_TITLE ?? "Prompt Panic 95",
  };

  if (cloudflareToken) {
    headers["cf-aig-authorization"] = `Bearer ${cloudflareToken}`;
  }

  return {
    mode: "cloudflare-gateway" as const,
    url: `${gatewayBase}/openrouter/chat/completions`,
    headers,
  };
}

export async function generateText({
  messages,
  profileId,
  temperature = 0.4,
  timeoutMs = Number(process.env.LLM_TIMEOUT_MS ?? "6000"),
}: GatewayRequest): Promise<GatewayResponse> {
  const profile = modelProfiles[profileId];
  const target = resolveGatewayTarget();
  const body: Record<string, unknown> = {
    model: profile.primary,
    messages,
    temperature,
  };

  if (profile.fallbacks?.length) {
    body.models = [profile.primary, ...profile.fallbacks];
  }

  const response = await fetch(target.url, {
    method: "POST",
    headers: target.headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gateway error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as {
    model?: string;
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error("Gateway returned an empty response");
  }

  return {
    text,
    model: data.model ?? profile.primary,
  };
}
