-- CreateEnum
CREATE TYPE "RosterStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "Category" (
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("code")
);

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "legacyId" INTEGER NOT NULL,
ADD COLUMN     "displayName" TEXT NOT NULL,
ADD COLUMN     "categoryCode" TEXT NOT NULL,
ADD COLUMN     "rosterStatus" "RosterStatus" NOT NULL,
ADD COLUMN     "statusReason" TEXT,
ADD COLUMN     "statusChangedOn" DATE,
ALTER COLUMN "givenName" DROP NOT NULL,
ALTER COLUMN "familyName" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Player_legacyId_key" ON "Player"("legacyId");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_categoryCode_fkey" FOREIGN KEY ("categoryCode") REFERENCES "Category"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
