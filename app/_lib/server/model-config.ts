export type ModelProfileId =
  | "trap-generator"
  | "judge"
  | "cheap-classifier"
  | "daily-challenge";

type ModelProfile = {
  primary: string;
  fallbacks?: string[];
};

export const modelProfiles: Record<ModelProfileId, ModelProfile> = {
  "trap-generator": {
    primary: "openai/gpt-oss-120b:free",
    fallbacks: [
      "meta-llama/llama-3.3-70b-instruct:free",
      "qwen/qwen3-coder:free",
    ],
  },
  judge: {
    primary: "openai/gpt-oss-120b:free",
    fallbacks: [
      "meta-llama/llama-3.3-70b-instruct:free",
      "qwen/qwen3-coder:free",
    ],
  },
  "cheap-classifier": {
    primary: "meta-llama/llama-3.2-3b-instruct:free",
  },
  "daily-challenge": {
    primary: "openai/gpt-oss-120b:free",
    fallbacks: ["meta-llama/llama-3.3-70b-instruct:free"],
  },
};
