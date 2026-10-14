-- AlterTable
ALTER TABLE "Player" ADD COLUMN "birthDate" DATE,
ADD COLUMN "membershipNumber" TEXT,
ADD COLUMN "jerseyNumber" INTEGER,
ADD COLUMN "dniCiphertext" TEXT,
ADD COLUMN "joinedOn" DATE;
