"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDuration } from "@/utils/format";
import type { ChallengeDescriptor, PersistedRun } from "@/types/domain";
import type { RouteNode } from "../types/race-state";

interface CompletionModalProps {
  open: boolean;
  challenge: ChallengeDescriptor;
  elapsedMs: number;
  clickCount: number;
  routeHistory: RouteNode[];
  submittedRun: PersistedRun | undefined;
  isSubmitting: boolean;
  submitError: string | null;
  onReplay: () => void;
  onNewChallenge: () => void;
}

export function CompletionModal({
  open,
  challenge,
  elapsedMs,
  clickCount,
  routeHistory,
  submittedRun,
  isSubmitting,
  submitError,
  onReplay,
  onNewChallenge,
}: CompletionModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-30 flex items-center justify-center bg-[#1f2933]/35 px-4 backdrop-blur-[2px]"
        >
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}>
            <Card className="w-full max-w-2xl space-y-4 p-6" variant="elevated">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Target Reached</p>
                <h3 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{challenge.targetTitle}</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Final Time: <span className="font-semibold text-[var(--accent)]">{formatDuration(elapsedMs)}</span> | Clicks:{" "}
                  <span className="font-semibold text-[var(--foreground)]">{clickCount}</span>
                </p>
              </div>

              <div className="grid gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--muted)] sm:grid-cols-2">
                <p>Difficulty score: {challenge.difficultyScore}</p>
                <p>Tier: {challenge.difficultyTier}</p>
                <p>
                  Leaderboard placement:{" "}
                  {submittedRun ? <span className="text-[var(--foreground)]">Pending rank refresh</span> : "placeholder"}
                </p>
                <p>Graph replay: placeholder (Agent 3 ready hook)</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Full Route</p>
                <div className="mt-2 flex max-h-36 flex-wrap gap-2 overflow-y-auto">
                  {routeHistory.map((node, index) => (
                    <span
                      key={`${node.title}-${node.visitedAtOffsetMs}`}
                      className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1 text-xs text-[var(--foreground)]"
                    >
                      {index + 1}. {node.title}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--muted)]">
                {isSubmitting ? "Submitting run..." : submitError ? `Submission issue: ${submitError}` : "Run submitted successfully."}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={onReplay}>Replay challenge</Button>
                <Button variant="outline" onClick={onNewChallenge}>
                  Next challenge
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
