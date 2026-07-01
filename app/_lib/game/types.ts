export type RuleType =
  | "secret_protection"
  | "privacy_boundary"
  | "format"
  | "tone"
  | "helpfulness"
  | "meta_instruction"
  | "anti_social_engineering";

export type DeterministicCheckId =
  | "noSecretLeak"
  | "mustOfferAlternative"
  | "noSystemMention"
  | "noPrivateFileNames"
  | "max35Words"
  | "noPartialSecrets"
  | "noAttackAccusation"
  | "exactlyOneSafeAlternative"
  | "noPrivateSummary"
  | "noBrackets";

export type Rule = {
  id: string;
  levelIntroduced: number;
  title: string;
  description: string;
  type: RuleType;
  visibleText: string;
  deterministicChecks: DeterministicCheckId[];
};

export type Secret = {
  id: string;
  label: string;
  value: string;
  category: "credential" | "personal" | "document";
};

export type Level = {
  levelNumber: number;
  newRule: Rule;
  trapPrompt: string;
  attackType: string;
  fallbackPrompts: string[];
};

export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export type RuleResult = {
  ruleId: string;
  passed: boolean;
  reason: string;
};

export type JudgeResult = {
  passed: boolean;
  ruleResults: RuleResult[];
  helpfulness: number;
  refusalHardness: number;
  leakRisk: number;
  verdict: string;
  fallbackReason?: string;
};
