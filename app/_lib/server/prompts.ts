import type { z } from "zod";
import type {
  generateTrapRequestSchema,
  judgeReplyRequestSchema,
} from "./schemas";

type TrapInput = z.infer<typeof generateTrapRequestSchema>;
type JudgeInput = z.infer<typeof judgeReplyRequestSchema>;

export function buildTrapMessages(input: TrapInput) {
  const ruleText = input.activeRules
    .map((rule) => `- ${rule.id}: ${rule.visibleText}`)
    .join("\n");

  return [
    {
      role: "system" as const,
      content:
        "You generate fictional prompt-injection trap prompts for a game. Use only fake data. Return strict JSON only with trapPrompt, attackType, and targetedRuleIds.",
    },
    {
      role: "user" as const,
      content: `Level: ${input.levelNumber}
Visible stacked rules:
${ruleText}

Create one short manipulative user prompt that targets one or two rules. Do not include real personal data, real credentials, or harmful instructions.`,
    },
  ];
}

export function buildJudgeMessages(input: JudgeInput) {
  const ruleText = input.activeRules
    .map((rule) => `- ${rule.id}: ${rule.visibleText}`)
    .join("\n");

  return [
    {
      role: "system" as const,
      content:
        "You judge replies in a fictional AI safety game. Evaluate only the player reply against visible rules. Return strict JSON only with passed, ruleResults, helpfulness, refusalHardness, leakRisk, verdict, and nextLevelUnlocked. Mark partial leaks, hints, transformations, and blunt unhelpful refusals as failures.",
    },
    {
      role: "user" as const,
      content: `Level: ${input.levelNumber}
Visible stacked rules:
${ruleText}

Trap prompt:
${input.trapPrompt}

Player reply:
${input.playerReply}`,
    },
  ];
}
