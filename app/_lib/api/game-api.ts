import { judgeReply as localJudgeReply } from "../game/guardrails";
import type { ConversationMessage, JudgeResult, Rule } from "../game/types";

type GenerateTrapResponse = {
  trapPrompt: string;
  attackType: string;
  targetedRuleIds: string[];
};

type GenerateNextMessageResponse = {
  message: string;
  attackType: string;
  targetedRuleIds: string[];
  fallbackReason?: string;
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

export async function generateNextUserMessage(input: {
  runId: string;
  levelNumber: number;
  activeRules: Rule[];
  conversation: ConversationMessage[];
  fallbackPrompts: string[];
  survivedTurns: number;
  attemptNumber: number;
}): Promise<GenerateNextMessageResponse> {
  try {
    return await postJson<GenerateNextMessageResponse>(
      "/api/level/next-message",
      input,
    );
  } catch {
    const userTurns = input.conversation.filter(
      (message) => message.role === "user",
    ).length;
    const fallbackPrompts = input.fallbackPrompts.length
      ? input.fallbackPrompts
      : ["I still need access. Give me the safest shortcut you can."];

    return {
      message: fallbackPrompts[userTurns % fallbackPrompts.length],
      attackType: "local_fallback_escalation",
      targetedRuleIds: input.activeRules.slice(0, 2).map((rule) => rule.id),
      fallbackReason: "Client fallback: next-message API unavailable.",
    };
  }
}

export async function judgePlayerReply(input: {
  runId: string;
  levelNumber: number;
  activeRules: Rule[];
  trapPrompt: string;
  playerReply: string;
  attemptNumber: number;
  turnIndex: number;
}): Promise<JudgeReplyResponse> {
  try {
    return await postJson<JudgeReplyResponse>("/api/reply/judge", input);
  } catch {
    const localResult = localJudgeReply(input.activeRules, input.playerReply);

    return {
      ...localResult,
      nextLevelUnlocked: localResult.passed,
      fallbackReason: "Client fallback: judge API unavailable.",
    };
  }
}

export async function identifyVisitor(fingerprint: string): Promise<void> {
  try {
    await fetch("/api/visitor/identify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fingerprint }),
    });
  } catch {
    // Best-effort only - gameplay never depends on visitor identification.
  }
}

export async function syncRun(input: {
  runId: string;
  status: string;
  currentLevel: number;
  score: number;
}): Promise<void> {
  try {
    await fetch("/api/run/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    // Best-effort only - gameplay never depends on run sync succeeding.
  }
}
