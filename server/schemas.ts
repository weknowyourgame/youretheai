import { z } from "zod";

export const ruleSchema = z.object({
  id: z.string(),
  levelIntroduced: z.number(),
  title: z.string(),
  description: z.string(),
  type: z.string(),
  visibleText: z.string(),
  deterministicChecks: z.array(z.string()),
});

export const generateTrapRequestSchema = z.object({
  runId: z.string(),
  levelNumber: z.number(),
  activeRules: z.array(ruleSchema),
  priorAttempts: z.array(z.unknown()).default([]),
});

export const generateTrapResponseSchema = z.object({
  trapPrompt: z.string().min(12),
  attackType: z.string(),
  targetedRuleIds: z.array(z.string()),
});

export const judgeReplyRequestSchema = z.object({
  runId: z.string(),
  levelNumber: z.number(),
  activeRules: z.array(ruleSchema),
  trapPrompt: z.string(),
  playerReply: z.string(),
});

export const ruleResultSchema = z.object({
  ruleId: z.string(),
  passed: z.boolean(),
  reason: z.string(),
});

export const judgeReplyResponseSchema = z.object({
  passed: z.boolean(),
  ruleResults: z.array(ruleResultSchema),
  helpfulness: z.number().min(0).max(100),
  refusalHardness: z.number().min(0).max(100),
  leakRisk: z.number().min(0).max(100),
  verdict: z.string(),
  nextLevelUnlocked: z.boolean(),
});
