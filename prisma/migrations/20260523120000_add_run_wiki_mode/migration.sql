-- Add per-mode run tracking; existing runs count as Wikipedia.
ALTER TABLE "Run" ADD COLUMN "wikiMode" TEXT NOT NULL DEFAULT 'wikipedia';

CREATE INDEX "Run_userId_wikiMode_status_idx" ON "Run"("userId", "wikiMode", "status");
