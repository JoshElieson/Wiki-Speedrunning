"use client";

import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import type { GhostRun, RacePerformanceSnapshot } from "../types/ghost-race";
import {
  compareUserAgainstGhost,
  computeGhostProgressPercent,
  getCurrentGhostStep,
  isGhostFinished,
} from "../utils/replay-utils";
import { GhostProgressBar } from "./GhostProgressBar";

interface GhostParticipantRowProps {
  ghostRun: GhostRun;
  elapsedMs: number;
  userPerformance?: RacePerformanceSnapshot;
}

function formatMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function GhostParticipantRow({ ghostRun, elapsedMs, userPerformance }: GhostParticipantRowProps) {
  const currentStep = getCurrentGhostStep(ghostRun, elapsedMs);
  const finished = isGhostFinished(ghostRun, elapsedMs);
  const progress = computeGhostProgressPercent(ghostRun, elapsedMs);
  const liveClickCount = currentStep?.stepIndex ?? 0;
  const comparison = userPerformance ? compareUserAgainstGhost(userPerformance, ghostRun) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)] p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">{ghostRun.participant.username}</p>
          <p className="truncate text-xs text-[var(--muted)]">{currentStep?.articleTitle ?? ghostRun.route[0] ?? "Starting..."}</p>
        </div>
        <Badge variant={finished ? "success" : "neutral"}>{finished ? "Finished" : "Racing"}</Badge>
      </div>

      <div className="mt-2">
        <GhostProgressBar progressPercent={progress} isFinished={finished} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
        <span>Clicks {liveClickCount}</span>
        <span>PB {formatMs(ghostRun.durationMs)}</span>
        <span>{Math.round(progress)}%</span>
      </div>

      {comparison ? (
        <p className="mt-2 text-xs text-[var(--muted)]">
          {comparison.isAheadOnTime ? "Ahead" : "Behind"} by {formatMs(Math.abs(comparison.timeDeltaMs))} /{" "}
          {comparison.isAheadOnClicks ? "fewer" : "more"} clicks ({Math.abs(comparison.clickDelta)})
        </p>
      ) : null}
    </motion.div>
  );
}
