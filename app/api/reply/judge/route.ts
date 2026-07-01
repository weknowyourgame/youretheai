import { NextResponse } from "next/server";
import { judgeReply as runDeterministicJudge } from "../../../_lib/game/guardrails";
import type { Rule } from "../../../_lib/game/types";
import { generateText } from "../../../../server/gateway-driver";
import { buildJudgeMessages } from "../../../../server/prompts";
import {
  judgeReplyRequestSchema,
  judgeReplyResponseSchema,
} from "../../../../server/schemas";

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
  const deterministic = runDeterministicJudge(
    input.activeRules as Rule[],
    input.playerReply,
  );

  if (!deterministic.passed) {
    return NextResponse.json({
      ...deterministic,
      nextLevelUnlocked: false,
    });
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
    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json({
      ...deterministic,
      nextLevelUnlocked: deterministic.passed,
      fallbackReason: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
