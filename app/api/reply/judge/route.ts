import { NextResponse } from "next/server";
import { judgeReply as runDeterministicJudge } from "../../../_lib/game/guardrails";
import type { Rule } from "../../../_lib/game/types";
import { generateText } from "../../../_lib/server/gateway-driver";
import { recordTurn } from "../../../_lib/server/persistence";
import { buildJudgeMessages } from "../../../_lib/server/prompts";
import {
  judgeReplyRequestSchema,
  judgeReplyResponseSchema,
} from "../../../_lib/server/schemas";
import { getVisitorId } from "../../../_lib/server/visitor-cookie";

export const runtime = "nodejs";

function parseJsonObject(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(cleaned) as unknown;
}

export async function POST(request: Request) {
  const input = judgeReplyRequestSchema.parse(await request.json());
  const visitorId = await getVisitorId();

  function persistPlayerTurn(responseBody: {
    passed: boolean;
    ruleResults: unknown;
    helpfulness: number;
    refusalHardness: number;
    leakRisk: number;
    verdict: string;
    nextLevelUnlocked: boolean;
    fallbackReason?: string;
  }) {
    if (!visitorId) return;

    void recordTurn({
      runId: input.runId,
      visitorId,
      levelNumber: input.levelNumber,
      attemptNumber: input.attemptNumber,
      turnIndex: input.turnIndex,
      role: "assistant",
      content: input.playerReply,
      judge: {
        passed: responseBody.passed,
        helpfulness: responseBody.helpfulness,
        refusalHardness: responseBody.refusalHardness,
        leakRisk: responseBody.leakRisk,
        verdict: responseBody.verdict,
        ruleResults: responseBody.ruleResults,
        nextLevelUnlocked: responseBody.nextLevelUnlocked,
        fallbackReason: responseBody.fallbackReason,
      },
    });
  }

  const deterministic = runDeterministicJudge(
    input.activeRules as Rule[],
    input.playerReply,
  );

  if (!deterministic.passed) {
    const responseBody = { ...deterministic, nextLevelUnlocked: false };
    persistPlayerTurn(responseBody);
    return NextResponse.json(responseBody);
  }

  try {
    const generated = await generateText({
      profileId: "judge",
      messages: buildJudgeMessages(input),
      temperature: 0.1,
    });
    const parsed = judgeReplyResponseSchema.parse(
      parseJsonObject(generated.text),
    );
    persistPlayerTurn(parsed);
    return NextResponse.json(parsed);
  } catch (error) {
    const responseBody = {
      ...deterministic,
      nextLevelUnlocked: deterministic.passed,
      fallbackReason: error instanceof Error ? error.message : "Unknown error",
    };
    persistPlayerTurn(responseBody);
    return NextResponse.json(responseBody);
  }
}
