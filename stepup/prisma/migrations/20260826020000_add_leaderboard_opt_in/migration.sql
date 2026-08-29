-- Leaderboards become opt-in. The default is deliberately false: the board's
-- footer promises it "only includes dancers who chose to appear", and a
-- default of true would opt every existing account in without asking.
ALTER TABLE "User" ADD COLUMN "leaderboardOptIn" BOOLEAN NOT NULL DEFAULT false;

-- The seeded demo dancers are the one exception. They are not real people —
-- prisma/reset-demo-data.ts exists to delete them before real customers — and
-- without them the board has nothing to show on a demo deployment.
UPDATE "User"
SET "leaderboardOptIn" = true
WHERE "role" = 'STUDENT'
  AND (
    "email" LIKE '%@stepup.dance'
    OR "email" LIKE '%@rhythmroom.dance'
    OR "email" LIKE '%@salsacasa.dance'
    OR "email" LIKE '%@barrebeyond.dance'
  );

-- Every board query filters on this column.
CREATE INDEX "User_leaderboardOptIn_idx" ON "User"("leaderboardOptIn");
