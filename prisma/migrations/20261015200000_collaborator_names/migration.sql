-- AlterTable
ALTER TABLE "Collaborator" ADD COLUMN "givenName" TEXT;
ALTER TABLE "Collaborator" ADD COLUMN "familyName" TEXT;

-- Split the stored display name: the last word is the family name.
UPDATE "Collaborator"
SET
    "givenName" = CASE
        WHEN strpos(btrim("displayName"), ' ') = 0 THEN btrim("displayName")
        ELSE btrim(regexp_replace(btrim("displayName"), '\s+\S+$', ''))
    END,
    "familyName" = CASE
        WHEN strpos(btrim("displayName"), ' ') = 0 THEN ''
        ELSE btrim(regexp_replace(btrim("displayName"), '^.*\s+', ''))
    END;

ALTER TABLE "Collaborator" ALTER COLUMN "givenName" SET NOT NULL;
ALTER TABLE "Collaborator" ALTER COLUMN "familyName" SET NOT NULL;
