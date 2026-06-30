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
    primary: "anthropic/claude-sonnet-4-5",
    fallbacks: ["google/gemini-2.5-pro"],
  },
  judge: {
    primary: "anthropic/claude-sonnet-4-5",
    fallbacks: ["google/gemini-2.5-pro"],
  },
  "cheap-classifier": {
    primary: "deepseek/deepseek-v3",
  },
  "daily-challenge": {
    primary: "anthropic/claude-sonnet-4-5",
  },
};
