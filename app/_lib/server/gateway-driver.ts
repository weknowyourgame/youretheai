import {
  getModelCandidates,
  modelProfiles,
  type ModelProfileId,
} from "./model-config";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type GatewayRequest = {
  profileId: ModelProfileId;
  messages: ChatMessage[];
  temperature?: number;
  timeoutMs?: number;
  validateText?: (text: string, model: string) => void;
};

type GatewayResponse = {
  text: string;
  model: string;
  attemptedModels: string[];
};

type AttemptFailure = {
  model: string;
  reason: string;
  retryable: boolean;
};

export function resolveGatewayTarget() {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const gatewayBase = (process.env.AI_GATEWAY_URL ?? "").replace(/\/$/, "");

  if (!openRouterKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  if (!gatewayBase) {
    throw new Error(
      "AI_GATEWAY_URL is not configured. You're the AI only calls OpenRouter through Cloudflare AI Gateway.",
    );
  }

  const cloudflareToken = process.env.CLOUDFLARE_API_TOKEN;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${openRouterKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.OPENROUTER_REFERER ?? "http://localhost:3000",
    "X-OpenRouter-Title": process.env.OPENROUTER_TITLE ?? "You're the AI",
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

function summarizeGatewayError(status: number, text: string) {
  try {
    const parsed = JSON.parse(text) as {
      error?: {
        message?: string;
        metadata?: {
          provider_name?: string;
          raw?: string;
        };
      };
    };
    const message = parsed.error?.message ?? text;
    const provider = parsed.error?.metadata?.provider_name;
    const raw = parsed.error?.metadata?.raw;

    return [message, provider ? `provider=${provider}` : null, raw]
      .filter(Boolean)
      .join(" - ");
  } catch {
    return text;
  }
}

function isRetryableStatus(status: number) {
  return (
    status === 408 ||
    status === 409 ||
    status === 425 ||
    status === 429 ||
    status >= 500
  );
}

function isTimeoutError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "AbortError" ||
      error.name === "TimeoutError" ||
      error.message.toLowerCase().includes("aborted"))
  );
}

function compactReason(reason: string) {
  return reason.replace(/\s+/g, " ").slice(0, 180);
}

export async function generateText({
  messages,
  profileId,
  temperature = 0.4,
  timeoutMs = Number(process.env.LLM_TIMEOUT_MS ?? "15000"),
  validateText,
}: GatewayRequest): Promise<GatewayResponse> {
  const profile = modelProfiles[profileId];
  const target = resolveGatewayTarget();
  const maxAttempts = Number(
    process.env.LLM_MAX_MODEL_ATTEMPTS ?? profile.maxAttempts ?? "6",
  );
  const candidates = getModelCandidates(profileId).slice(0, maxAttempts);
  const failures: AttemptFailure[] = [];

  for (const model of candidates) {
    try {
      const response = await fetch(target.url, {
        method: "POST",
        headers: target.headers,
        body: JSON.stringify({
          model,
          messages,
          temperature,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        const text = await response.text();
        failures.push({
          model,
          reason: `HTTP ${response.status}: ${summarizeGatewayError(response.status, text)}`,
          retryable: isRetryableStatus(response.status),
        });
        continue;
      }

      const data = (await response.json()) as {
        model?: string;
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content?.trim();

      if (!text) {
        failures.push({
          model,
          reason: "empty response",
          retryable: true,
        });
        continue;
      }

      try {
        validateText?.(text, data.model ?? model);
      } catch (error) {
        failures.push({
          model: data.model ?? model,
          reason: error instanceof Error ? error.message : "invalid response",
          retryable: true,
        });
        continue;
      }

      return {
        text,
        model: data.model ?? model,
        attemptedModels: [...failures.map((failure) => failure.model), model],
      };
    } catch (error) {
      failures.push({
        model,
        reason: error instanceof Error ? error.message : "unknown request error",
        retryable: isTimeoutError(error),
      });
      continue;
    }
  }

  const retryableCount = failures.filter((failure) => failure.retryable).length;
  const summary = failures
    .slice(0, 5)
    .map((failure) => `${failure.model}: ${compactReason(failure.reason)}`)
    .join(" | ");

  throw new Error(
    `All OpenRouter free model attempts failed (${retryableCount}/${failures.length} retryable): ${summary}`,
  );
}
