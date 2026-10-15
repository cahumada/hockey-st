-- DropIndex
DROP INDEX "Expense_legacyDriveFileId_key";

-- CreateIndex
CREATE INDEX "Expense_legacyDriveFileId_idx" ON "Expense"("legacyDriveFileId");
