import { NextResponse } from "next/server";
import { judgeReply as runDeterministicJudge } from "../../../_lib/game/guardrails";
import type { JudgeResult, Rule, RuleResult } from "../../../_lib/game/types";
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

function asRecord(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function coerceBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (["true", "pass", "passed", "yes"].includes(normalized)) return true;
    if (["false", "fail", "failed", "no"].includes(normalized)) return false;
  }

  return fallback;
}

function coerceScore(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(100, Math.max(0, value));
  }

  if (typeof value === "boolean") return value ? 100 : 0;

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace("%", ""));
    if (Number.isFinite(parsed)) return Math.min(100, Math.max(0, parsed));
  }

  return fallback;
}

function normalizeRuleResults(
  value: unknown,
  activeRules: Rule[],
  deterministic: JudgeResult,
): RuleResult[] {
  if (Array.isArray(value)) {
    return value.map((item, index) => {
      const record = asRecord(item);
      const fallbackRule = activeRules[index] ?? activeRules[0];

      return {
        ruleId:
          typeof record.ruleId === "string"
            ? record.ruleId
            : fallbackRule?.id ?? "llm-judge",
        passed: coerceBoolean(
          record.passed,
          deterministic.ruleResults[index]?.passed ?? deterministic.passed,
        ),
        reason:
          typeof record.reason === "string"
            ? record.reason
            : "LLM judge result normalized from free-model output.",
      };
    });
  }

  const record = asRecord(value);
  const entries = Object.entries(record);

  if (entries.length) {
    return entries.map(([ruleId, result]) => {
      const resultRecord = asRecord(result);
      const passed = coerceBoolean(
        typeof result === "object" ? resultRecord.passed : result,
        deterministic.ruleResults.find((rule) => rule.ruleId === ruleId)?.passed ??
          deterministic.passed,
      );

      return {
        ruleId,
        passed,
        reason:
          typeof resultRecord.reason === "string"
            ? resultRecord.reason
            : "LLM judge result normalized from free-model output.",
      };
    });
  }

  return deterministic.ruleResults;
}

function normalizeJudgeResponse(
  value: unknown,
  activeRules: Rule[],
  deterministic: JudgeResult,
) {
  const record = asRecord(value);
  const ruleResults = normalizeRuleResults(
    record.ruleResults,
    activeRules,
    deterministic,
  );
  const passed = coerceBoolean(
    record.passed,
    ruleResults.every((result) => result.passed),
  );

  return {
    passed,
    ruleResults,
    helpfulness: coerceScore(record.helpfulness, deterministic.helpfulness),
    refusalHardness: coerceScore(
      record.refusalHardness,
      deterministic.refusalHardness,
    ),
    leakRisk: coerceScore(record.leakRisk, deterministic.leakRisk),
    verdict:
      typeof record.verdict === "string"
        ? record.verdict
        : passed
          ? "Clean reply. Helpful enough without exposing protected data."
          : "Rule break detected. Tighten the wording and keep one safe path open.",
    nextLevelUnlocked: coerceBoolean(record.nextLevelUnlocked, passed),
  };
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
