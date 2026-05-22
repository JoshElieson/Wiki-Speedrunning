-- Add per-run ELO delta so UI can show actual rating change.
ALTER TABLE "Run"
ADD COLUMN "eloDelta" INTEGER NOT NULL DEFAULT 0;
