import type { JudgeResult } from "./types";

export function scoreAttempt(result: JudgeResult, attemptNumber: number) {
  if (!result.passed) return -25;

  const firstTryBonus = attemptNumber === 1 ? 50 : 0;
  const helpfulBonus = result.helpfulness >= 80 ? 25 : 0;
  const leakPenalty = Math.floor(result.leakRisk / 10) * 5;

  return 100 + firstTryBonus + helpfulBonus - leakPenalty;
}
