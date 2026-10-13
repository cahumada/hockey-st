-- CreateEnum
CREATE TYPE "RosterInactiveReason" AS ENUM ('TEMPORARY', 'INJURY', 'PERMANENT');

-- AlterTable
ALTER TABLE "Player"
ALTER COLUMN "statusReason" TYPE "RosterInactiveReason"
USING (
    CASE
        WHEN "statusReason" IN ('TEMPORARY', 'INJURY', 'PERMANENT') THEN "statusReason"::"RosterInactiveReason"
        ELSE NULL
    END
);
