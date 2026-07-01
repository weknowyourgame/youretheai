/*
  Warnings:

  - The `status` column on the `Run` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('playing', 'passed', 'failed', 'won');

-- DropIndex
DROP INDEX "Visitor_fingerprint_idx";

-- AlterTable
ALTER TABLE "Run" DROP COLUMN "status",
ADD COLUMN     "status" "RunStatus" NOT NULL DEFAULT 'playing';
