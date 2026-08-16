-- Public-facing name for hosts who trade under a different name than their own
-- (e.g. an independent instructor as "Maya R. Dance"). Nullable, so this
-- applies cleanly to an existing database with no backfill required.
ALTER TABLE "User" ADD COLUMN "displayName" TEXT;
