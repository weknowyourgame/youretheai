-- CreateEnum
CREATE TYPE "TurnRole" AS ENUM ('user', 'assistant');

-- CreateTable
CREATE TABLE "Visitor" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "userAgent" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'playing',
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "score" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turn" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "levelNumber" INTEGER NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "turnIndex" INTEGER NOT NULL,
    "role" "TurnRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attackType" TEXT,
    "targetedRuleIds" TEXT[],
    "passed" BOOLEAN,
    "helpfulness" INTEGER,
    "refusalHardness" INTEGER,
    "leakRisk" INTEGER,
    "verdict" TEXT,
    "ruleResults" JSONB,
    "nextLevelUnlocked" BOOLEAN,
    "fallbackReason" TEXT,

    CONSTRAINT "Turn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Visitor_fingerprint_key" ON "Visitor"("fingerprint");

-- CreateIndex
CREATE INDEX "Visitor_fingerprint_idx" ON "Visitor"("fingerprint");

-- CreateIndex
CREATE INDEX "Run_visitorId_idx" ON "Run"("visitorId");

-- CreateIndex
CREATE INDEX "Turn_runId_levelNumber_attemptNumber_idx" ON "Turn"("runId", "levelNumber", "attemptNumber");

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "Visitor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turn" ADD CONSTRAINT "Turn_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
