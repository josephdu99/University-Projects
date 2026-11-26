-- AlterTable
ALTER TABLE "ClassSeries" ADD COLUMN     "importRow" JSONB,
ADD COLUMN     "importRowKey" TEXT,
ADD COLUMN     "scheduleSourceId" TEXT;

-- CreateTable
CREATE TABLE "ScheduleSource" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "mapping" JSONB,
    "headers" TEXT[],
    "autoSync" BOOLEAN NOT NULL DEFAULT true,
    "activatedAt" TIMESTAMP(3),
    "lastHash" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "pendingNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studioId" TEXT NOT NULL,

    CONSTRAINT "ScheduleSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRun" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PARSED',
    "raw" JSONB,
    "model" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceId" TEXT NOT NULL,
    "documentId" TEXT,

    CONSTRAINT "ImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRow" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "uncertain" TEXT[],
    "missing" TEXT[],
    "rowKey" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "matchedSeriesId" TEXT,
    "runId" TEXT NOT NULL,

    CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleChange" (
    "id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "fromValue" TEXT NOT NULL,
    "toValue" TEXT NOT NULL,
    "bookedCount" INTEGER NOT NULL,
    "row" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "sourceId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,

    CONSTRAINT "ScheduleChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduleSource_studioId_idx" ON "ScheduleSource"("studioId");

-- CreateIndex
CREATE INDEX "ScheduleSource_kind_activatedAt_idx" ON "ScheduleSource"("kind", "activatedAt");

-- CreateIndex
CREATE INDEX "ImportRun_createdAt_idx" ON "ImportRun"("createdAt");

-- CreateIndex
CREATE INDEX "ImportRun_sourceId_idx" ON "ImportRun"("sourceId");

-- CreateIndex
CREATE INDEX "ImportRow_runId_idx" ON "ImportRow"("runId");

-- CreateIndex
CREATE INDEX "ScheduleChange_sourceId_status_idx" ON "ScheduleChange"("sourceId", "status");

-- CreateIndex
CREATE INDEX "ClassSeries_scheduleSourceId_idx" ON "ClassSeries"("scheduleSourceId");

-- AddForeignKey
ALTER TABLE "ClassSeries" ADD CONSTRAINT "ClassSeries_scheduleSourceId_fkey" FOREIGN KEY ("scheduleSourceId") REFERENCES "ScheduleSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleSource" ADD CONSTRAINT "ScheduleSource_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRun" ADD CONSTRAINT "ImportRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ScheduleSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRun" ADD CONSTRAINT "ImportRun_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ImportRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleChange" ADD CONSTRAINT "ScheduleChange_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ScheduleSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleChange" ADD CONSTRAINT "ScheduleChange_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "ClassSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

