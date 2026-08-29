-- Leaderboards become opt-in. The default is deliberately false: the board's
-- footer promises it "only includes dancers who chose to appear", and a
-- default of true would opt every existing account in without asking.
--
-- Every statement is written to be safely re-runnable. If a deployment dies
-- part-way through, Prisma marks the migration failed and blocks every later
-- deploy until it is resolved by hand; IF NOT EXISTS means a retry just
-- finishes the job instead.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "leaderboardOptIn" BOOLEAN NOT NULL DEFAULT false;

-- The seeded demo dancers are the one exception. They are not real people —
-- prisma/reset-demo-data.ts exists to delete them before real customers — and
-- without them the board has nothing to show on a demo deployment.
UPDATE "User"
SET "leaderboardOptIn" = true
WHERE "role" = 'STUDENT'
  AND "leaderboardOptIn" = false
  AND (
    "email" LIKE '%@stepup.dance'
    OR "email" LIKE '%@rhythmroom.dance'
    OR "email" LIKE '%@salsacasa.dance'
    OR "email" LIKE '%@barrebeyond.dance'
  );

-- Every board query filters on this column.
CREATE INDEX IF NOT EXISTS "User_leaderboardOptIn_idx" ON "User"("leaderboardOptIn");
