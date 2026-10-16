-- Given and family names are optional, independent of the shown alias.
ALTER TABLE "Collaborator" ALTER COLUMN "givenName" DROP NOT NULL;
ALTER TABLE "Collaborator" ALTER COLUMN "familyName" DROP NOT NULL;

UPDATE "Collaborator"
SET "givenName" = NULL
WHERE btrim("givenName") = '';

UPDATE "Collaborator"
SET "familyName" = NULL
WHERE btrim("familyName") = '';
