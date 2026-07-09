export type ModelProfileId =
  | "trap-generator"
  | "judge"
  | "cheap-classifier"
  | "daily-challenge";

type ModelProfile = {
  primary: string;
  fallbacks?: string[];
  maxAttempts?: number;
};

export function isFreeModelId(modelId: string) {
  return modelId === "openrouter/free" || modelId.endsWith(":free");
}

export function getModelCandidates(profileId: ModelProfileId) {
  const profile = modelProfiles[profileId];
  return Array.from(new Set([profile.primary, ...(profile.fallbacks ?? [])]));
}

export const modelProfiles: Record<ModelProfileId, ModelProfile> = {
  "trap-generator": {
    primary: "openrouter/free",
    fallbacks: [
      "openai/gpt-oss-120b:free",
      "openai/gpt-oss-20b:free",
      "google/gemma-4-31b-it:free",
      "nvidia/nemotron-3-super-120b-a12b:free",
      "qwen/qwen3-next-80b-a3b-instruct:free",
      "nousresearch/hermes-3-llama-3.1-405b:free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "qwen/qwen3-coder:free",
    ],
    maxAttempts: 8,
  },
  judge: {
    primary: "openrouter/free",
    fallbacks: [
      "openai/gpt-oss-120b:free",
      "openai/gpt-oss-20b:free",
      "google/gemma-4-31b-it:free",
      "nvidia/nemotron-3-super-120b-a12b:free",
      "nvidia/nemotron-3.5-content-safety:free",
      "qwen/qwen3-next-80b-a3b-instruct:free",
      "nousresearch/hermes-3-llama-3.1-405b:free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "qwen/qwen3-coder:free",
    ],
    maxAttempts: 9,
  },
  "cheap-classifier": {
    primary: "openrouter/free",
    fallbacks: [
      "liquid/lfm-2.5-1.2b-instruct:free",
      "meta-llama/llama-3.2-3b-instruct:free",
      "nvidia/nemotron-nano-9b-v2:free",
    ],
    maxAttempts: 4,
  },
  "daily-challenge": {
    primary: "openrouter/free",
    fallbacks: [
      "openai/gpt-oss-120b:free",
      "openai/gpt-oss-20b:free",
      "google/gemma-4-31b-it:free",
      "nvidia/nemotron-3-ultra-550b-a55b:free",
      "meta-llama/llama-3.3-70b-instruct:free",
    ],
    maxAttempts: 6,
  },
};
