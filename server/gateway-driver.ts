import { modelProfiles, type ModelProfileId } from "./model-config";

const OPENROUTER_DIRECT = "https://openrouter.ai/api/v1/chat/completions";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type GatewayRequest = {
  profileId: ModelProfileId;
  messages: ChatMessage[];
  temperature?: number;
};

type GatewayResponse = {
  text: string;
  model: string;
};

export function resolveGatewayTarget() {
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (!openRouterKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const gatewayBase = (process.env.AI_GATEWAY_URL ?? "").replace(/\/$/, "");
  const cloudflareToken = process.env.CLOUDFLARE_API_TOKEN;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${openRouterKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.OPENROUTER_REFERER ?? "http://localhost:5173",
    "X-OpenRouter-Title": process.env.OPENROUTER_TITLE ?? "Prompt Panic 95",
  };

  if (gatewayBase) {
    if (cloudflareToken) {
      headers["cf-aig-authorization"] = `Bearer ${cloudflareToken}`;
    }

    return {
      mode: "cloudflare-gateway" as const,
      url: `${gatewayBase}/openrouter/chat/completions`,
      headers,
    };
  }

  return {
    mode: "openrouter-direct" as const,
    url: OPENROUTER_DIRECT,
    headers,
  };
}

export async function generateText({
  messages,
  profileId,
  temperature = 0.4,
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
