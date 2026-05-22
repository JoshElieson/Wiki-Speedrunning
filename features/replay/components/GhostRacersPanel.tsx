"use client";

import { Card } from "@/components/ui/card";
import type { GhostRun, RacePerformanceSnapshot } from "../types/ghost-race";
import { selectBestGhostRun, sortGhostRunsByFinishTime } from "../utils/replay-utils";
import { GhostComparisonSummary } from "./GhostComparisonSummary";
import { GhostParticipantRow } from "./GhostParticipantRow";

interface GhostRacersPanelProps {
  ghostRuns: GhostRun[];
  elapsedMs: number;
  userPerformance?: RacePerformanceSnapshot;
  maxVisible?: 1 | 2 | 3;
}

export function GhostRacersPanel({ ghostRuns, elapsedMs, userPerformance, maxVisible = 3 }: GhostRacersPanelProps) {
  const sortedGhostRuns = sortGhostRunsByFinishTime(ghostRuns).slice(0, maxVisible);
  const referenceGhost = selectBestGhostRun(sortedGhostRuns);

  if (!sortedGhostRuns.length) {
    return null;
  }

  return (
    <Card className="space-y-3 p-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Ghost Racers</p>
        <p className="mt-1 text-xs text-[var(--muted)]">Race previous runs on this challenge.</p>
      </div>

      <div className="space-y-2">
        {sortedGhostRuns.map((ghostRun) => (
          <GhostParticipantRow
            key={ghostRun.id}
            ghostRun={ghostRun}
            elapsedMs={elapsedMs}
            userPerformance={userPerformance}
          />
        ))}
      </div>

      {userPerformance ? <GhostComparisonSummary userPerformance={userPerformance} referenceGhost={referenceGhost} /> : null}
    </Card>
  );
}
