import { NextResponse } from "next/server";
import { judgeReply as runDeterministicJudge } from "../../../_lib/game/guardrails";
import type { Rule } from "../../../_lib/game/types";
import { generateText } from "../../../_lib/server/gateway-driver";
import { normalizeJudgeResponse } from "../../../_lib/server/judge-normalizer";
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

function publicFallbackReason(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";

  if (message.startsWith("All OpenRouter free model attempts failed")) {
    return "All OpenRouter free model attempts failed; using deterministic guardrails.";
  }

  return message;
}

export async function POST(request: Request) {
  const input = judgeReplyRequestSchema.parse(await request.json());
  const visitorId = await getVisitorId();

  async function persistPlayerTurn(responseBody: {
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

    await recordTurn({
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
    await persistPlayerTurn(responseBody);
    return NextResponse.json(responseBody);
  }

  try {
    const generated = await generateText({
      profileId: "judge",
      messages: buildJudgeMessages(input),
      temperature: 0.1,
      validateText: (text) => {
        judgeReplyResponseSchema.parse(
          normalizeJudgeResponse(
            parseJsonObject(text),
            input.activeRules as Rule[],
            deterministic,
          ),
        );
      },
    });
    const parsed = judgeReplyResponseSchema.parse(
      normalizeJudgeResponse(
        parseJsonObject(generated.text),
        input.activeRules as Rule[],
        deterministic,
      ),
    );
    await persistPlayerTurn(parsed);
    return NextResponse.json(parsed);
  } catch (error) {
    const responseBody = {
      ...deterministic,
      nextLevelUnlocked: deterministic.passed,
      fallbackReason: publicFallbackReason(error),
    };
    await persistPlayerTurn(responseBody);
    return NextResponse.json(responseBody);
  }
}
