-- AlterTable
ALTER TABLE "exchanges" ADD COLUMN "operatorId" TEXT;
ALTER TABLE "exchanges" ADD COLUMN "operatorName" TEXT;

-- AlterTable
ALTER TABLE "groups" ADD COLUMN "leaderId" TEXT;

-- AlterTable
ALTER TABLE "students" ADD COLUMN "customPosition" TEXT;

-- CreateTable
CREATE TABLE "pet_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "eggToBaby" INTEGER NOT NULL DEFAULT 10,
    "babyToTeen" INTEGER NOT NULL DEFAULT 30,
    "teenToAdult" INTEGER NOT NULL DEFAULT 60,
    "adultToFinal" INTEGER NOT NULL DEFAULT 100,
    "assignMode" TEXT NOT NULL DEFAULT 'TEACHER_ASSIGN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_share_links" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "allowViewRanking" BOOLEAN NOT NULL DEFAULT true,
    "hidePointRecords" BOOLEAN NOT NULL DEFAULT false,
    "hideDeductions" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "share_links_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_share_links" ("allowViewRanking", "createdAt", "expiresAt", "hidePointRecords", "id", "isActive", "studentId", "token", "updatedAt") SELECT "allowViewRanking", "createdAt", "expiresAt", "hidePointRecords", "id", "isActive", "studentId", "token", "updatedAt" FROM "share_links";
DROP TABLE "share_links";
ALTER TABLE "new_share_links" RENAME TO "share_links";
CREATE UNIQUE INDEX "share_links_token_key" ON "share_links"("token");
CREATE INDEX "share_links_token_idx" ON "share_links"("token");
CREATE INDEX "share_links_studentId_idx" ON "share_links"("studentId");
CREATE INDEX "share_links_expiresAt_idx" ON "share_links"("expiresAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "pet_settings_classId_key" ON "pet_settings"("classId");

-- CreateIndex
CREATE INDEX "pet_settings_classId_idx" ON "pet_settings"("classId");
