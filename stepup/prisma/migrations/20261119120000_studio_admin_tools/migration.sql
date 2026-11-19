-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "enrolmentId" TEXT,
ADD COLUMN     "noShowAt" TIMESTAMP(3),
ADD COLUMN     "noShowNoticeAt" TIMESTAMP(3),
ADD COLUMN     "note" TEXT,
ADD COLUMN     "role" TEXT;

-- AlterTable
ALTER TABLE "ClassSeries" ADD COLUMN     "balanceX" INTEGER,
ADD COLUMN     "cancelPolicy" TEXT,
ADD COLUMN     "coursePriceCents" INTEGER,
ADD COLUMN     "courseWeeks" INTEGER,
ADD COLUMN     "followCap" INTEGER,
ADD COLUMN     "kids" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "leadCap" INTEGER,
ADD COLUMN     "listing" TEXT NOT NULL DEFAULT 'DROP_IN',
ADD COLUMN     "partnerRule" TEXT,
ADD COLUMN     "stepupSpots" INTEGER,
ADD COLUMN     "venueId" TEXT;

-- AlterTable
ALTER TABLE "DanceClass" ADD COLUMN     "balanceX" INTEGER,
ADD COLUMN     "cancelPolicy" TEXT,
ADD COLUMN     "followCap" INTEGER,
ADD COLUMN     "kids" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "leadCap" INTEGER,
ADD COLUMN     "listing" TEXT NOT NULL DEFAULT 'DROP_IN',
ADD COLUMN     "partnerRule" TEXT,
ADD COLUMN     "stepupSpots" INTEGER,
ADD COLUMN     "teacherListSentAt" TIMESTAMP(3),
ADD COLUMN     "venueChangedAt" TIMESTAMP(3),
ADD COLUMN     "venueId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "saleType" TEXT NOT NULL DEFAULT 'AGENT';

-- AlterTable
ALTER TABLE "Studio" ADD COLUMN     "cancelPolicy" TEXT NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "draftBio" TEXT,
ADD COLUMN     "draftPreparedAt" TIMESTAMP(3),
ADD COLUMN     "draftStyles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "healthFormUrl" TEXT,
ADD COLUMN     "kidsClasses" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passOfferAuto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passOfferMessage" TEXT,
ADD COLUMN     "passOfferPassId" TEXT,
ADD COLUMN     "payoutDay" TEXT NOT NULL DEFAULT 'THU',
ADD COLUMN     "profileApprovedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StudioMember" ADD COLUMN     "wwccExpiry" TIMESTAMP(3),
ADD COLUMN     "wwccNumber" TEXT,
ADD COLUMN     "wwccReminderAt" TIMESTAMP(3),
ADD COLUMN     "wwccVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "wwccVerifiedById" TEXT;

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioPhoto" (
    "id" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "draft" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studioId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,

    CONSTRAINT "StudioPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "suburb" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studioId" TEXT,
    "userId" TEXT,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LevelName" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scale" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studioId" TEXT NOT NULL,

    CONSTRAINT "LevelName_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassTemplate" (
    "id" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "scale" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "wear" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "studioId" TEXT NOT NULL,

    CONSTRAINT "ClassTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioTerms" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "mode" TEXT NOT NULL,
    "waiver" BOOLEAN NOT NULL DEFAULT true,
    "conduct" BOOLEAN NOT NULL DEFAULT true,
    "cancellation" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studioId" TEXT NOT NULL,
    "documentId" TEXT,

    CONSTRAINT "StudioTerms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TermsAcceptance" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "termsId" TEXT NOT NULL,

    CONSTRAINT "TermsAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioPass" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "link" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studioId" TEXT NOT NULL,

    CONSTRAINT "StudioPass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassOffer" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "recipients" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studioId" TEXT NOT NULL,
    "passId" TEXT NOT NULL,

    CONSTRAINT "PassOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassOfferRecipient" (
    "id" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "offerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "PassOfferRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioOptOut" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "StudioOptOut_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioCredit" (
    "id" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'aud',
    "reason" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "studioId" TEXT,
    "fromBookingId" TEXT,
    "usedByBookingId" TEXT,

    CONSTRAINT "StudioCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrolment" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,

    CONSTRAINT "Enrolment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseInterest" (
    "id" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studioId" TEXT NOT NULL,

    CONSTRAINT "CourseInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassMessage" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "recipients" INTEGER NOT NULL,
    "channels" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classId" TEXT NOT NULL,
    "senderId" TEXT,

    CONSTRAINT "ClassMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalkIn" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classId" TEXT NOT NULL,

    CONSTRAINT "WalkIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TextCommand" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,

    CONSTRAINT "TextCommand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudioPhoto_imageId_key" ON "StudioPhoto"("imageId");

-- CreateIndex
CREATE INDEX "StudioPhoto_studioId_sort_idx" ON "StudioPhoto"("studioId", "sort");

-- CreateIndex
CREATE INDEX "Venue_studioId_idx" ON "Venue"("studioId");

-- CreateIndex
CREATE INDEX "Venue_userId_idx" ON "Venue"("userId");

-- CreateIndex
CREATE INDEX "LevelName_studioId_idx" ON "LevelName"("studioId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassTemplate_studioId_style_scale_key" ON "ClassTemplate"("studioId", "style", "scale");

-- CreateIndex
CREATE UNIQUE INDEX "StudioTerms_studioId_version_key" ON "StudioTerms"("studioId", "version");

-- CreateIndex
CREATE INDEX "TermsAcceptance_userId_studioId_idx" ON "TermsAcceptance"("userId", "studioId");

-- CreateIndex
CREATE UNIQUE INDEX "TermsAcceptance_userId_termsId_key" ON "TermsAcceptance"("userId", "termsId");

-- CreateIndex
CREATE INDEX "PassOfferRecipient_userId_idx" ON "PassOfferRecipient"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PassOfferRecipient_offerId_userId_key" ON "PassOfferRecipient"("offerId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioOptOut_studioId_userId_key" ON "StudioOptOut"("studioId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioCredit_fromBookingId_key" ON "StudioCredit"("fromBookingId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioCredit_usedByBookingId_key" ON "StudioCredit"("usedByBookingId");

-- CreateIndex
CREATE INDEX "StudioCredit_userId_hostId_idx" ON "StudioCredit"("userId", "hostId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrolment_userId_seriesId_key" ON "Enrolment"("userId", "seriesId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseInterest_studioId_style_email_key" ON "CourseInterest"("studioId", "style", "email");

-- CreateIndex
CREATE INDEX "ClassMessage_classId_createdAt_idx" ON "ClassMessage"("classId", "createdAt");

-- CreateIndex
CREATE INDEX "WalkIn_classId_idx" ON "WalkIn"("classId");

-- CreateIndex
CREATE INDEX "TextCommand_userId_status_idx" ON "TextCommand"("userId", "status");

-- CreateIndex
CREATE INDEX "Booking_enrolmentId_idx" ON "Booking"("enrolmentId");

-- AddForeignKey
ALTER TABLE "StudioMember" ADD CONSTRAINT "StudioMember_wwccVerifiedById_fkey" FOREIGN KEY ("wwccVerifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioPhoto" ADD CONSTRAINT "StudioPhoto_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioPhoto" ADD CONSTRAINT "StudioPhoto_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelName" ADD CONSTRAINT "LevelName_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTemplate" ADD CONSTRAINT "ClassTemplate_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioTerms" ADD CONSTRAINT "StudioTerms_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioTerms" ADD CONSTRAINT "StudioTerms_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermsAcceptance" ADD CONSTRAINT "TermsAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermsAcceptance" ADD CONSTRAINT "TermsAcceptance_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermsAcceptance" ADD CONSTRAINT "TermsAcceptance_termsId_fkey" FOREIGN KEY ("termsId") REFERENCES "StudioTerms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioPass" ADD CONSTRAINT "StudioPass_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassOffer" ADD CONSTRAINT "PassOffer_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassOffer" ADD CONSTRAINT "PassOffer_passId_fkey" FOREIGN KEY ("passId") REFERENCES "StudioPass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassOfferRecipient" ADD CONSTRAINT "PassOfferRecipient_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "PassOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassOfferRecipient" ADD CONSTRAINT "PassOfferRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioOptOut" ADD CONSTRAINT "StudioOptOut_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioOptOut" ADD CONSTRAINT "StudioOptOut_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioCredit" ADD CONSTRAINT "StudioCredit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioCredit" ADD CONSTRAINT "StudioCredit_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrolment" ADD CONSTRAINT "Enrolment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrolment" ADD CONSTRAINT "Enrolment_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "ClassSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseInterest" ADD CONSTRAINT "CourseInterest_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassMessage" ADD CONSTRAINT "ClassMessage_classId_fkey" FOREIGN KEY ("classId") REFERENCES "DanceClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassMessage" ADD CONSTRAINT "ClassMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalkIn" ADD CONSTRAINT "WalkIn_classId_fkey" FOREIGN KEY ("classId") REFERENCES "DanceClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TextCommand" ADD CONSTRAINT "TextCommand_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TextCommand" ADD CONSTRAINT "TextCommand_classId_fkey" FOREIGN KEY ("classId") REFERENCES "DanceClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSeries" ADD CONSTRAINT "ClassSeries_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DanceClass" ADD CONSTRAINT "DanceClass_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_enrolmentId_fkey" FOREIGN KEY ("enrolmentId") REFERENCES "Enrolment"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- Backfill: a studio's existing cover photo becomes the first in its gallery.
INSERT INTO "StudioPhoto" ("id", "sort", "draft", "createdAt", "studioId", "imageId")
SELECT 'cover_' || s."id", 0, false, CURRENT_TIMESTAMP, s."id", s."photoId"
FROM "Studio" s
WHERE s."photoId" IS NOT NULL
ON CONFLICT DO NOTHING;
