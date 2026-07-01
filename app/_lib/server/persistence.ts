import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "./db";

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
    await prisma.$transaction([
      prisma.run.upsert({
        where: { id: input.runId },
        create: {
          id: input.runId,
          visitorId: input.visitorId,
          currentLevel: input.levelNumber,
        },
        update: { currentLevel: input.levelNumber },
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
  status: string;
  currentLevel: number;
  score: number;
};

export async function syncRun(input: SyncRunInput) {
  try {
    await prisma.run.upsert({
      where: { id: input.runId },
      create: {
        id: input.runId,
        visitorId: input.visitorId,
        status: input.status,
        currentLevel: input.currentLevel,
        score: input.score,
      },
      update: {
        status: input.status,
        currentLevel: input.currentLevel,
        score: input.score,
      },
    });
  } catch (error) {
    console.error("[persistence] syncRun failed", error);
  }
}
