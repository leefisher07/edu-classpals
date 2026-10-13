-- CreateTable
CREATE TABLE "pick_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "operatorName" TEXT NOT NULL,
    "studentIds" TEXT NOT NULL,
    "studentNames" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "pick_history_classId_idx" ON "pick_history"("classId");

-- CreateIndex
CREATE INDEX "pick_history_createdAt_idx" ON "pick_history"("createdAt");

-- CreateIndex
CREATE INDEX "pick_history_classId_createdAt_idx" ON "pick_history"("classId", "createdAt");
