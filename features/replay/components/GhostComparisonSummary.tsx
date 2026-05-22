"use client";

import { Card } from "@/components/ui/card";
import type { GhostRun, RacePerformanceSnapshot } from "../types/ghost-race";
import { compareUserAgainstGhost } from "../utils/replay-utils";

interface GhostComparisonSummaryProps {
  userPerformance: RacePerformanceSnapshot;
  referenceGhost: GhostRun | null;
}

function formatMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function GhostComparisonSummary({ userPerformance, referenceGhost }: GhostComparisonSummaryProps) {
  if (!referenceGhost) {
    return null;
  }

  const comparison = compareUserAgainstGhost(userPerformance, referenceGhost);

  return (
    <Card className="p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Ghost Comparison</p>
      <p className="mt-1 text-sm text-[var(--foreground)]">
        {comparison.isAheadOnTime ? "Ahead" : "Behind"} {referenceGhost.participant.username} by{" "}
        {formatMs(Math.abs(comparison.timeDeltaMs))}
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Clicks: {comparison.isAheadOnClicks ? "-" : "+"}
        {Math.abs(comparison.clickDelta)} against ghost PB
      </p>
    </Card>
  );
}
