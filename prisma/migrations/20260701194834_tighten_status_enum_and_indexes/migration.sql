-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('playing', 'passed', 'failed', 'won');

-- DropIndex
DROP INDEX "Visitor_fingerprint_idx";

-- AlterTable
-- Convert the existing text values in-place instead of dropping the column,
-- since every existing value ('playing'/'passed'/'failed'/'won') already
-- matches an enum label exactly - verified against a populated table before
-- landing this change.
ALTER TABLE "Run"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "RunStatus" USING ("status"::"RunStatus"),
  ALTER COLUMN "status" SET DEFAULT 'playing'::"RunStatus";
