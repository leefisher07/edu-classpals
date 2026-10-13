-- AlterTable
ALTER TABLE "users" ADD COLUMN "currentClassId" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_point_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "ruleId" TEXT,
    "operatorId" TEXT NOT NULL,
    "operatorName" TEXT NOT NULL,
    "canUndo" BOOLEAN NOT NULL DEFAULT true,
    "undoExpiresAt" DATETIME,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" DATETIME,
    "revokedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "point_records_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "point_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "point_records_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "point_rules" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_point_records" ("canUndo", "classId", "createdAt", "id", "operatorId", "operatorName", "points", "reason", "ruleId", "studentId", "undoExpiresAt") SELECT "canUndo", "classId", "createdAt", "id", "operatorId", "operatorName", "points", "reason", "ruleId", "studentId", "undoExpiresAt" FROM "point_records";
DROP TABLE "point_records";
ALTER TABLE "new_point_records" RENAME TO "point_records";
CREATE INDEX "point_records_classId_idx" ON "point_records"("classId");
CREATE INDEX "point_records_studentId_idx" ON "point_records"("studentId");
CREATE INDEX "point_records_createdAt_idx" ON "point_records"("createdAt");
CREATE INDEX "point_records_classId_createdAt_idx" ON "point_records"("classId", "createdAt");
CREATE INDEX "point_records_studentId_createdAt_idx" ON "point_records"("studentId", "createdAt");
CREATE INDEX "point_records_isRevoked_idx" ON "point_records"("isRevoked");
CREATE TABLE "new_students" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL DEFAULT 'MALE',
    "studentNumber" TEXT,
    "avatar" TEXT,
    "avatarBgColor" TEXT DEFAULT '#3B82F6',
    "isCadre" BOOLEAN NOT NULL DEFAULT false,
    "cadrePosition" TEXT,
    "groupId" TEXT,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "availablePoints" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "students_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "students_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_students" ("avatar", "avatarBgColor", "cadrePosition", "classId", "createdAt", "gender", "groupId", "id", "isCadre", "name", "sortOrder", "studentNumber", "totalPoints", "updatedAt") SELECT "avatar", "avatarBgColor", "cadrePosition", "classId", "createdAt", "gender", "groupId", "id", "isCadre", "name", "sortOrder", "studentNumber", "totalPoints", "updatedAt" FROM "students";
DROP TABLE "students";
ALTER TABLE "new_students" RENAME TO "students";
CREATE INDEX "students_classId_idx" ON "students"("classId");
CREATE INDEX "students_groupId_idx" ON "students"("groupId");
CREATE INDEX "students_totalPoints_idx" ON "students"("totalPoints");
CREATE INDEX "students_classId_totalPoints_idx" ON "students"("classId", "totalPoints");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "users_currentClassId_idx" ON "users"("currentClassId");
