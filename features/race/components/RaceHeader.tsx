"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RaceTimer } from "./RaceTimer";
import type { RaceStatus } from "../types/race-state";

interface RaceHeaderProps {
  status: RaceStatus;
  elapsedMs: number;
  currentArticleTitle: string | null;
  targetArticleTitle: string | null;
  onStart: () => void;
  startDisabled: boolean;
}

export function RaceHeader({
  status,
  elapsedMs,
  currentArticleTitle,
  targetArticleTitle,
  onStart,
  startDisabled,
}: RaceHeaderProps) {
  const statusLabel = status === "active" ? "Live" : status;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Current Article</p>
          <h2 className="text-2xl font-semibold text-[var(--foreground)]">{currentArticleTitle ?? "Press Start Race"}</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">Goal: {targetArticleTitle ?? "--"}</p>
        </div>
        <div className="flex items-center gap-4">
          <RaceTimer elapsedMs={elapsedMs} statusLabel={statusLabel} />
          <Button onClick={onStart} disabled={startDisabled}>
            Start Race
          </Button>
        </div>
      </div>
    </Card>
  );
}
