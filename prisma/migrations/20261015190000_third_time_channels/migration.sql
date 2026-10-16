-- CreateTable
CREATE TABLE "ThirdTimeChannel" (
    "id" TEXT NOT NULL,
    "legacyId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "status" "CatalogStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThirdTimeChannel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ThirdTimeChannel_legacyId_key" ON "ThirdTimeChannel"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "ThirdTimeChannel_description_key" ON "ThirdTimeChannel"("description");

-- Seed channels already used by third-time fees.
INSERT INTO "ThirdTimeChannel" ("id", "legacyId", "description", "status", "createdAt", "updatedAt")
SELECT
    'ttchannel_' || lpad(numbered.n::text, 4, '0'),
    numbered.n::int,
    numbered.channel,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT channel, row_number() OVER (ORDER BY channel) AS n
    FROM (
        SELECT DISTINCT btrim("channel") AS channel
        FROM "ThirdTimeFee"
        WHERE "channel" IS NOT NULL AND btrim("channel") <> ''
    ) AS channels
) AS numbered;
