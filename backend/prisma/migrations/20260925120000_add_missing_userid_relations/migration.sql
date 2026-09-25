-- Preserve legacy data by assigning it to a bootstrap system user before enforcing the required relation.
INSERT INTO "User" ("id", "email", "name", "provider", "createdAt", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'system@outboxlabs.local',
  'Legacy System User',
  'local',
  NOW(),
  NOW()
)
ON CONFLICT ("email") DO NOTHING;

ALTER TABLE "Sender"
  ADD COLUMN "userId" TEXT;

ALTER TABLE "Email"
  ADD COLUMN "userId" TEXT;

UPDATE "Sender"
SET "userId" = (
  SELECT "id"
  FROM "User"
  WHERE "email" = 'system@outboxlabs.local'
  LIMIT 1
)
WHERE "userId" IS NULL;

UPDATE "Email"
SET "userId" = (
  SELECT "id"
  FROM "User"
  WHERE "email" = 'system@outboxlabs.local'
  LIMIT 1
)
WHERE "userId" IS NULL;

CREATE INDEX "Sender_userId_idx"
  ON "Sender"("userId");

CREATE INDEX "Sender_userId_email_idx"
  ON "Sender"("userId", "email");

CREATE INDEX "Email_userId_idx"
  ON "Email"("userId");

CREATE INDEX "Email_userId_status_idx"
  ON "Email"("userId", "status");

ALTER TABLE "Sender"
  ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "Email"
  ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "Sender"
  ADD CONSTRAINT "Sender_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Email"
  ADD CONSTRAINT "Email_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
