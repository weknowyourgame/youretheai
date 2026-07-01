import type { Prisma, RunStatus } from "../../../generated/prisma/client";
import { prisma } from "./db";

// "won" is the only truly terminal state a run can reach - once set, an
// out-of-order request must never be allowed to revert it. Every other
// status ("playing"/"passed"/"failed") legitimately recurs during normal
// play (e.g. retrying a failed level goes back to "playing"), so those are
// not guarded here.
function resolveRunStatus(
  existingStatus: RunStatus | undefined,
  incomingStatus: RunStatus,
): RunStatus {
  if (existingStatus === "won") return "won";
  return incomingStatus;
}

// currentLevel must never move backward within a run - a stale, out-of-order
// write should not un-advance a player's progress.
function resolveCurrentLevel(
  existingLevel: number | undefined,
  incomingLevel: number,
): number {
  return Math.max(existingLevel ?? 0, incomingLevel);
}

export async function upsertVisitor(fingerprint: string, userAgent?: string) {
  try {
    return await prisma.visitor.upsert({
      where: { fingerprint },
      create: { fingerprint, userAgent },
      update: { userAgent },
    });
  } catch (error) {
    console.error("[persistence] upsertVisitor failed", error);
    return null;
  }
}

export async function countVisitors() {
  try {
    return await prisma.visitor.count();
  } catch (error) {
    console.error("[persistence] countVisitors failed", error);
    return null;
  }
}

type RecordTurnInput = {
  runId: string;
  visitorId: string;
  levelNumber: number;
  attemptNumber: number;
  turnIndex: number;
  role: "user" | "assistant";
  content: string;
  attackType?: string;
  targetedRuleIds?: string[];
  judge?: {
    passed: boolean;
    helpfulness: number;
    refusalHardness: number;
    leakRisk: number;
    verdict: string;
    ruleResults: unknown;
    nextLevelUnlocked: boolean;
    fallbackReason?: string;
  };
};

export async function recordTurn(input: RecordTurnInput) {
  try {
    const existing = await prisma.run.findUnique({
      where: { id: input.runId },
      select: { currentLevel: true },
    });
    const currentLevel = resolveCurrentLevel(
      existing?.currentLevel,
      input.levelNumber,
    );

    await prisma.$transaction([
      prisma.run.upsert({
        where: { id: input.runId },
        create: {
          id: input.runId,
          visitorId: input.visitorId,
          currentLevel,
        },
        update: { currentLevel },
      }),
      prisma.turn.create({
        data: {
          runId: input.runId,
          levelNumber: input.levelNumber,
          attemptNumber: input.attemptNumber,
          turnIndex: input.turnIndex,
          role: input.role,
          content: input.content,
          attackType: input.attackType,
          targetedRuleIds: input.targetedRuleIds ?? [],
          ...(input.judge
            ? {
                passed: input.judge.passed,
                helpfulness: input.judge.helpfulness,
                refusalHardness: input.judge.refusalHardness,
                leakRisk: input.judge.leakRisk,
                verdict: input.judge.verdict,
                ruleResults: input.judge.ruleResults as Prisma.InputJsonValue,
                nextLevelUnlocked: input.judge.nextLevelUnlocked,
                fallbackReason: input.judge.fallbackReason,
              }
            : {}),
        },
      }),
    ]);
  } catch (error) {
    console.error("[persistence] recordTurn failed", error);
  }
}

type SyncRunInput = {
  runId: string;
  visitorId: string;
  status: RunStatus;
  currentLevel: number;
  score: number;
};

export async function syncRun(input: SyncRunInput) {
  try {
    const existing = await prisma.run.findUnique({
      where: { id: input.runId },
      select: { status: true, currentLevel: true },
    });
    const status = resolveRunStatus(existing?.status, input.status);
    const currentLevel = resolveCurrentLevel(
      existing?.currentLevel,
      input.currentLevel,
    );

    await prisma.run.upsert({
      where: { id: input.runId },
      create: {
        id: input.runId,
        visitorId: input.visitorId,
        status,
        currentLevel,
        score: input.score,
      },
      update: {
        status,
        currentLevel,
        score: input.score,
      },
    });
  } catch (error) {
    console.error("[persistence] syncRun failed", error);
  }
}
