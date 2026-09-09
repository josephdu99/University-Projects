-- Independent instructors pick a line-art mark for their avatar rather than
-- initials or an emoji. Nullable: everyone else keeps what they have, and a
-- null here is what tells the UI to fall back to initials.
--
-- Written to be safely re-runnable, so a deployment that dies part-way
-- through can finish on a retry instead of leaving Prisma with a migration
-- marked failed and blocking every later deploy.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarMark" TEXT;
