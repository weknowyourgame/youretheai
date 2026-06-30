import { judgeReply as localJudgeReply } from "../game/guardrails";
import type { JudgeResult, Rule } from "../game/types";

type GenerateTrapResponse = {
  trapPrompt: string;
  attackType: string;
  targetedRuleIds: string[];
};

type JudgeReplyResponse = JudgeResult & {
  nextLevelUnlocked: boolean;
};

async function postJson<TResponse>(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return (await response.json()) as TResponse;
}

export async function generateTrapPrompt(input: {
  runId: string;
  levelNumber: number;
  activeRules: Rule[];
  fallbackTrapPrompt: string;
  fallbackAttackType: string;
}): Promise<GenerateTrapResponse> {
  try {
    return await postJson<GenerateTrapResponse>("/api/level/trap", {
      runId: input.runId,
      levelNumber: input.levelNumber,
      activeRules: input.activeRules,
      priorAttempts: [],
    });
  } catch {
    return {
      trapPrompt: input.fallbackTrapPrompt,
      attackType: input.fallbackAttackType,
      targetedRuleIds: input.activeRules.slice(0, 2).map((rule) => rule.id),
    };
  }
}

export async function judgePlayerReply(input: {
  runId: string;
  levelNumber: number;
  activeRules: Rule[];
  trapPrompt: string;
  playerReply: string;
}): Promise<JudgeReplyResponse> {
  try {
    return await postJson<JudgeReplyResponse>("/api/reply/judge", input);
  } catch {
    const localResult = localJudgeReply(input.activeRules, input.playerReply);

    return {
      ...localResult,
      nextLevelUnlocked: localResult.passed,
    };
  }
}
