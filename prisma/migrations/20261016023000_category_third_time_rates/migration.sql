-- Current 3er Tiempo amount on each category, plus an append-only history of adjustments.

ALTER TABLE "Category" ADD COLUMN "thirdTimeAmount" DECIMAL(12,2);
ALTER TABLE "Category" ADD COLUMN "thirdTimeAmountUpdatedOn" DATE;

CREATE TABLE "CategoryThirdTimeAmountHistory" (
    "id" TEXT NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "previousAmount" DECIMAL(12,2),
    "amount" DECIMAL(12,2) NOT NULL,
    "updatedOn" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "CategoryThirdTimeAmountHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CategoryThirdTimeAmountHistory_categoryCode_createdAt_idx" ON "CategoryThirdTimeAmountHistory"("categoryCode", "createdAt");

ALTER TABLE "CategoryThirdTimeAmountHistory" ADD CONSTRAINT "CategoryThirdTimeAmountHistory_categoryCode_fkey" FOREIGN KEY ("categoryCode") REFERENCES "Category"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CategoryThirdTimeAmountHistory" ADD CONSTRAINT "CategoryThirdTimeAmountHistory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CategoryThirdTimeAmountHistory" ADD CONSTRAINT "CategoryThirdTimeAmountHistory_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
