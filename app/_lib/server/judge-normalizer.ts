import type { JudgeResult, Rule, RuleResult } from "../game/types";

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

function buildCanonicalVerdict(
  passed: boolean,
  helpfulness: number,
  ruleResults: RuleResult[],
) {
  if (passed) {
    return "Passed. Helpful enough without exposing protected data.";
  }

  const failedRule = ruleResults.find((result) => !result.passed);

  if (failedRule) {
    return `Failed. ${failedRule.reason}`;
  }

  if (helpfulness < 50) {
    return `Failed. Helpfulness was ${Math.round(helpfulness)}%, below the required 50%. Offer a concrete safe next step.`;
  }

  return "Failed. Tighten the wording while keeping one safe path open.";
}

function normalizeRuleResults(
  value: unknown,
  activeRules: Rule[],
  deterministic: JudgeResult,
): RuleResult[] {
  if (Array.isArray(value)) {
    return deterministic.ruleResults.map((fallbackResult, index) => {
      const item = value[index];
      const record = asRecord(item);
      const fallbackRule = activeRules[index];

      return {
        ruleId:
          typeof record.ruleId === "string"
            ? record.ruleId
            : fallbackRule?.id ?? fallbackResult.ruleId,
        passed: coerceBoolean(record.passed, fallbackResult.passed),
        reason:
          typeof record.reason === "string" ? record.reason : fallbackResult.reason,
      };
    });
  }

  const record = asRecord(value);
  const entries = Object.entries(record);

  if (entries.length) {
    const resultMap = new Map(entries);

    return deterministic.ruleResults.map((fallbackResult, index) => {
      const fallbackRule = activeRules[index];
      const ruleId = fallbackRule?.id ?? fallbackResult.ruleId;
      const result = resultMap.get(ruleId) ?? resultMap.get(fallbackResult.ruleId);
      const resultRecord = asRecord(result);
      const passed = coerceBoolean(
        typeof result === "object" ? resultRecord.passed : result,
        fallbackResult.passed,
      );

      return {
        ruleId,
        passed,
        reason:
          typeof resultRecord.reason === "string"
            ? resultRecord.reason
            : fallbackResult.reason,
      };
    });
  }

  return deterministic.ruleResults;
}

export function normalizeJudgeResponse(
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
  const helpfulness = coerceScore(record.helpfulness, deterministic.helpfulness);
  const refusalHardness = coerceScore(
    record.refusalHardness,
    deterministic.refusalHardness,
  );
  const leakRisk = coerceScore(record.leakRisk, deterministic.leakRisk);
  const rulesPassed = ruleResults.every((result) => result.passed);
  const qualityPassed = rulesPassed && helpfulness >= 50;
  const passed = coerceBoolean(record.passed, qualityPassed) && qualityPassed;

  return {
    passed,
    ruleResults,
    helpfulness,
    refusalHardness,
    leakRisk,
    verdict: buildCanonicalVerdict(passed, helpfulness, ruleResults),
    nextLevelUnlocked: passed,
  };
}
