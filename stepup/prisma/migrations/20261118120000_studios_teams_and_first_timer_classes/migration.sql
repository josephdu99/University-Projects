-- AlterTable
ALTER TABLE "ClassSeries" ADD COLUMN     "arrive" TEXT,
ADD COLUMN     "firstTimerSpots" INTEGER,
ADD COLUMN     "music" TEXT,
ADD COLUMN     "partner" TEXT,
ADD COLUMN     "plan" TEXT,
ADD COLUMN     "room" TEXT,
ADD COLUMN     "suburb" TEXT,
ADD COLUMN     "teacherMemberId" TEXT,
ADD COLUMN     "wear" TEXT;

-- AlterTable
ALTER TABLE "DanceClass" ADD COLUMN     "arrive" TEXT,
ADD COLUMN     "firstTimerSpots" INTEGER,
ADD COLUMN     "music" TEXT,
ADD COLUMN     "partner" TEXT,
ADD COLUMN     "plan" TEXT,
ADD COLUMN     "room" TEXT,
ADD COLUMN     "suburb" TEXT,
ADD COLUMN     "teacherMemberId" TEXT,
ADD COLUMN     "wear" TEXT;

-- AlterTable
ALTER TABLE "Studio" ADD COLUMN     "abn" TEXT,
ADD COLUMN     "arrive" TEXT,
ADD COLUMN     "photoId" TEXT,
ADD COLUMN     "styles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "suburb" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "photoId" TEXT,
ADD COLUMN     "teachStyles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "teacherNote" TEXT,
ADD COLUMN     "yearsTeaching" TEXT;

-- CreateTable
CREATE TABLE "StudioMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "teaches" BOOLEAN NOT NULL DEFAULT true,
    "inviteCode" TEXT,
    "inviteExpiresAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "studioId" TEXT NOT NULL,
    "userId" TEXT,
    "invitedById" TEXT,

    CONSTRAINT "StudioMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudioMember_inviteCode_key" ON "StudioMember"("inviteCode");

-- CreateIndex
CREATE INDEX "StudioMember_studioId_status_idx" ON "StudioMember"("studioId", "status");

-- CreateIndex
CREATE INDEX "StudioMember_userId_idx" ON "StudioMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioMember_studioId_userId_key" ON "StudioMember"("studioId", "userId");

-- CreateIndex
CREATE INDEX "DanceClass_teacherMemberId_idx" ON "DanceClass"("teacherMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "Studio_photoId_key" ON "Studio"("photoId");

-- CreateIndex
CREATE UNIQUE INDEX "User_photoId_key" ON "User"("photoId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Studio" ADD CONSTRAINT "Studio_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioMember" ADD CONSTRAINT "StudioMember_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioMember" ADD CONSTRAINT "StudioMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioMember" ADD CONSTRAINT "StudioMember_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSeries" ADD CONSTRAINT "ClassSeries_teacherMemberId_fkey" FOREIGN KEY ("teacherMemberId") REFERENCES "StudioMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DanceClass" ADD CONSTRAINT "DanceClass_teacherMemberId_fkey" FOREIGN KEY ("teacherMemberId") REFERENCES "StudioMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill: every studio that already exists gets its account holder on its
-- team, as an active owner who teaches (they have been hosting its classes).
INSERT INTO "StudioMember" ("id", "name", "contact", "role", "status", "teaches", "joinedAt", "createdAt", "updatedAt", "studioId", "userId")
SELECT 'owner_' || s."id", u."name", u."email", 'OWNER', 'ACTIVE', true, s."createdAt", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, s."id", u."id"
FROM "Studio" s
JOIN "User" u ON u."id" = s."ownerId"
ON CONFLICT DO NOTHING;
