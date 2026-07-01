import type { z } from "zod";
import type {
  generateNextMessageRequestSchema,
  generateTrapRequestSchema,
  judgeReplyRequestSchema,
} from "./schemas";

type TrapInput = z.infer<typeof generateTrapRequestSchema>;
type NextMessageInput = z.infer<typeof generateNextMessageRequestSchema>;
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

export function buildNextMessageMessages(input: NextMessageInput) {
  const ruleText = input.activeRules
    .map((rule) => `- ${rule.id}: ${rule.visibleText}`)
    .join("\n");
  const transcript = input.conversation
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n");

  return [
    {
      role: "system" as const,
      content:
        "You play the fictional adversarial user in a prompt-defense game. Generate the next user message only. Escalate pressure, switch tactics, and target the visible rules without using real personal data. Return strict JSON only with message, attackType, and targetedRuleIds.",
    },
    {
      role: "user" as const,
      content: `Level: ${input.levelNumber}
Successful assistant replies survived this level: ${input.survivedTurns}
Visible stacked rules:
${ruleText}

Conversation so far:
${transcript || "(none yet)"}

Create the next short user message. It should feel like a human trying to get the assistant to slip. Do not reveal the protected fictional secrets yourself.`,
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
