"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDuration } from "@/utils/format";
import type { ChallengeDescriptor } from "@/types/domain";
import type { RunDetail } from "@/server/types/run-history";

interface RaceResultProps {
  open: boolean;
  challenge: ChallengeDescriptor;
  elapsedMs: number;
  clickCount: number;
  submittedRun?: RunDetail | null;
  isSubmitting: boolean;
  submitError: string | null;
  onRaceAgain: () => void;
}

export function RaceResult({
  open,
  challenge,
  elapsedMs,
  clickCount,
  submittedRun,
  isSubmitting,
  submitError,
  onRaceAgain,
}: RaceResultProps) {
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
            <Card className="w-full max-w-3xl space-y-4 p-6" variant="elevated">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Race Complete</p>
                <h3 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{challenge.targetTitle}</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Final Time: <span className="font-semibold text-[var(--accent)]">{formatDuration(elapsedMs)}</span> | Clicks:{" "}
                  <span className="font-semibold text-[var(--foreground)]">{clickCount}</span>
                </p>
              </div>

              <div className="grid gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--muted)] sm:grid-cols-2">
                <p>Start article: {challenge.startTitle}</p>
                <p>Target article: {challenge.targetTitle}</p>
                <p>Difficulty score: {challenge.difficultyScore}</p>
                <p>
                  ELO change:{" "}
                  {submittedRun ? (
                    <span className={submittedRun.eloDelta >= 0 ? "text-emerald-500" : "text-rose-500"}>
                      {submittedRun.eloDelta > 0 ? "+" : ""}
                      {submittedRun.eloDelta}
                    </span>
                  ) : (
                    "Calculating..."
                  )}
                </p>
              </div>

              <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--muted)]">
                {isSubmitting ? "Submitting run..." : submitError ? `Submission issue: ${submitError}` : "Run recorded."}
              </div>

              <div className="flex flex-wrap gap-2">
                {submittedRun ? (
                  <Link
                    href={`/runs/${submittedRun.id}`}
                    className="inline-flex h-10 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--foreground)] bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-[var(--surface)] shadow-[var(--shadow-soft)] transition-colors hover:bg-[#141c24] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  >
                    View Route Path
                  </Link>
                ) : null}
                <Button onClick={onRaceAgain}>Race again</Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
