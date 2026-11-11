-- Guests book without an account, so a User can exist before it has a
-- password. Widening the column is safe for every existing row.
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- When each pre-class reminder went out. Null means "not sent yet", which is
-- what the reminder job selects on, so these double as the idempotency record.
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "remindedDayBeforeAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "remindedDayOfAt" TIMESTAMP(3);
