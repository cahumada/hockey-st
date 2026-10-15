-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "legacyRow" INTEGER,
    "spentOn" DATE NOT NULL,
    "expenseTypeId" TEXT NOT NULL,
    "unitAmount" DECIMAL(12,2) NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "notes" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "receiptPath" TEXT,
    "receiptContentType" TEXT,
    "legacyDriveFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Expense_legacyRow_key" ON "Expense"("legacyRow");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_legacyDriveFileId_key" ON "Expense"("legacyDriveFileId");

-- CreateIndex
CREATE INDEX "Expense_spentOn_idx" ON "Expense"("spentOn");

-- CreateIndex
CREATE INDEX "Expense_expenseTypeId_idx" ON "Expense"("expenseTypeId");

-- CreateIndex
CREATE INDEX "Expense_collaboratorId_idx" ON "Expense"("collaboratorId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_expenseTypeId_fkey" FOREIGN KEY ("expenseTypeId") REFERENCES "ExpenseType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
