-- CreateEnum
CREATE TYPE "ThirdTimeFeeStatus" AS ENUM ('PAID', 'PENDING', 'EXEMPT');

-- CreateTable
CREATE TABLE "ThirdTimeFee" (
    "id" TEXT NOT NULL,
    "legacyRow" INTEGER,
    "playerId" TEXT NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "amount" DECIMAL(12,2),
    "chargedOn" DATE NOT NULL,
    "paidOn" DATE,
    "receiptReference" TEXT,
    "channel" TEXT,
    "status" "ThirdTimeFeeStatus" NOT NULL,
    "controllerId" TEXT NOT NULL,
    "notes" TEXT,
    "receiptPath" TEXT,
    "receiptContentType" TEXT,
    "legacyDriveFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThirdTimeFee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ThirdTimeFee_legacyRow_key" ON "ThirdTimeFee"("legacyRow");

-- CreateIndex
CREATE INDEX "ThirdTimeFee_chargedOn_idx" ON "ThirdTimeFee"("chargedOn");

-- CreateIndex
CREATE INDEX "ThirdTimeFee_playerId_idx" ON "ThirdTimeFee"("playerId");

-- CreateIndex
CREATE INDEX "ThirdTimeFee_categoryCode_idx" ON "ThirdTimeFee"("categoryCode");

-- CreateIndex
CREATE INDEX "ThirdTimeFee_controllerId_idx" ON "ThirdTimeFee"("controllerId");

-- CreateIndex
CREATE INDEX "ThirdTimeFee_status_idx" ON "ThirdTimeFee"("status");

-- CreateIndex
CREATE INDEX "ThirdTimeFee_legacyDriveFileId_idx" ON "ThirdTimeFee"("legacyDriveFileId");

-- AddForeignKey
ALTER TABLE "ThirdTimeFee" ADD CONSTRAINT "ThirdTimeFee_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThirdTimeFee" ADD CONSTRAINT "ThirdTimeFee_categoryCode_fkey" FOREIGN KEY ("categoryCode") REFERENCES "Category"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThirdTimeFee" ADD CONSTRAINT "ThirdTimeFee_controllerId_fkey" FOREIGN KEY ("controllerId") REFERENCES "Collaborator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
