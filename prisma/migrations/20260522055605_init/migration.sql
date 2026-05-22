-- CreateEnum
CREATE TYPE "public"."RunStatus" AS ENUM ('COMPLETED', 'ABANDONED', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "public"."RoomStatus" AS ENUM ('WAITING', 'COUNTDOWN', 'ACTIVE', 'FINISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ParticipantStatus" AS ENUM ('JOINED', 'READY', 'RACING', 'FINISHED', 'LEFT');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Article" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "normalizedTitle" TEXT NOT NULL,
    "wikipediaPageId" INTEGER,
    "url" TEXT NOT NULL,
    "summary" TEXT,
    "isDisambiguation" BOOLEAN NOT NULL DEFAULT false,
    "linkCount" INTEGER NOT NULL DEFAULT 0,
    "pageViews30d" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Challenge" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "startArticleId" TEXT NOT NULL,
    "targetArticleId" TEXT NOT NULL,
    "difficultyScore" DOUBLE PRECISION NOT NULL,
    "shortestPathHint" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "seed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DailyChallenge" (
    "id" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Run" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "status" "public"."RunStatus" NOT NULL DEFAULT 'COMPLETED',
    "durationMs" INTEGER NOT NULL,
    "clickCount" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "antiCheatHash" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RunStep" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "fromArticleId" TEXT NOT NULL,
    "toArticleId" TEXT NOT NULL,
    "linkText" TEXT,
    "clickedAtOffsetMs" INTEGER NOT NULL,

    CONSTRAINT "RunStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LeaderboardEntry" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "bestTimeMs" INTEGER,
    "bestScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReplayMetadata" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "graphSnapshotUrl" TEXT,
    "timelineJson" JSONB,
    "eventCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReplayMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RatingRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ratingBefore" INTEGER NOT NULL,
    "ratingAfter" INTEGER NOT NULL,
    "delta" INTEGER NOT NULL,
    "context" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RatingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RaceRoom" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "challengeId" TEXT,
    "status" "public"."RoomStatus" NOT NULL DEFAULT 'WAITING',
    "maxParticipants" INTEGER NOT NULL DEFAULT 8,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaceRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RaceParticipant" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "public"."ParticipantStatus" NOT NULL DEFAULT 'JOINED',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "finalRunId" TEXT,

    CONSTRAINT "RaceParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "public"."User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Article_normalizedTitle_key" ON "public"."Article"("normalizedTitle");

-- CreateIndex
CREATE INDEX "Article_title_idx" ON "public"."Article"("title");

-- CreateIndex
CREATE INDEX "Article_updatedAt_idx" ON "public"."Article"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_slug_key" ON "public"."Challenge"("slug");

-- CreateIndex
CREATE INDEX "Challenge_isActive_updatedAt_idx" ON "public"."Challenge"("isActive", "updatedAt");

-- CreateIndex
CREATE INDEX "Challenge_difficultyScore_idx" ON "public"."Challenge"("difficultyScore");

-- CreateIndex
CREATE UNIQUE INDEX "DailyChallenge_dateKey_key" ON "public"."DailyChallenge"("dateKey");

-- CreateIndex
CREATE INDEX "DailyChallenge_challengeId_idx" ON "public"."DailyChallenge"("challengeId");

-- CreateIndex
CREATE INDEX "Run_challengeId_durationMs_idx" ON "public"."Run"("challengeId", "durationMs");

-- CreateIndex
CREATE INDEX "Run_userId_createdAt_idx" ON "public"."Run"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Run_status_createdAt_idx" ON "public"."Run"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RunStep_runId_sequence_idx" ON "public"."RunStep"("runId", "sequence");

-- CreateIndex
CREATE INDEX "RunStep_fromArticleId_idx" ON "public"."RunStep"("fromArticleId");

-- CreateIndex
CREATE INDEX "RunStep_toArticleId_idx" ON "public"."RunStep"("toArticleId");

-- CreateIndex
CREATE UNIQUE INDEX "RunStep_runId_sequence_key" ON "public"."RunStep"("runId", "sequence");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_scope_rank_idx" ON "public"."LeaderboardEntry"("scope", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardEntry_scope_userId_key" ON "public"."LeaderboardEntry"("scope", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReplayMetadata_runId_key" ON "public"."ReplayMetadata"("runId");

-- CreateIndex
CREATE INDEX "RatingRecord_userId_createdAt_idx" ON "public"."RatingRecord"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RaceRoom_code_key" ON "public"."RaceRoom"("code");

-- CreateIndex
CREATE INDEX "RaceRoom_status_updatedAt_idx" ON "public"."RaceRoom"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "RaceParticipant_roomId_status_idx" ON "public"."RaceParticipant"("roomId", "status");

-- CreateIndex
CREATE INDEX "RaceParticipant_userId_joinedAt_idx" ON "public"."RaceParticipant"("userId", "joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RaceParticipant_roomId_userId_key" ON "public"."RaceParticipant"("roomId", "userId");

-- AddForeignKey
ALTER TABLE "public"."Challenge" ADD CONSTRAINT "Challenge_startArticleId_fkey" FOREIGN KEY ("startArticleId") REFERENCES "public"."Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Challenge" ADD CONSTRAINT "Challenge_targetArticleId_fkey" FOREIGN KEY ("targetArticleId") REFERENCES "public"."Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DailyChallenge" ADD CONSTRAINT "DailyChallenge_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "public"."Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Run" ADD CONSTRAINT "Run_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Run" ADD CONSTRAINT "Run_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "public"."Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RunStep" ADD CONSTRAINT "RunStep_runId_fkey" FOREIGN KEY ("runId") REFERENCES "public"."Run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RunStep" ADD CONSTRAINT "RunStep_fromArticleId_fkey" FOREIGN KEY ("fromArticleId") REFERENCES "public"."Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RunStep" ADD CONSTRAINT "RunStep_toArticleId_fkey" FOREIGN KEY ("toArticleId") REFERENCES "public"."Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReplayMetadata" ADD CONSTRAINT "ReplayMetadata_runId_fkey" FOREIGN KEY ("runId") REFERENCES "public"."Run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RatingRecord" ADD CONSTRAINT "RatingRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RaceRoom" ADD CONSTRAINT "RaceRoom_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "public"."Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RaceParticipant" ADD CONSTRAINT "RaceParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."RaceRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RaceParticipant" ADD CONSTRAINT "RaceParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RaceParticipant" ADD CONSTRAINT "RaceParticipant_finalRunId_fkey" FOREIGN KEY ("finalRunId") REFERENCES "public"."Run"("id") ON DELETE SET NULL ON UPDATE CASCADE;
