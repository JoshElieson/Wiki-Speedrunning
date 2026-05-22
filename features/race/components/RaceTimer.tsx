"use client";

import { motion } from "framer-motion";
import { formatDuration } from "@/utils/format";

interface RaceTimerProps {
  elapsedMs: number;
  statusLabel: string;
}

export function RaceTimer({ elapsedMs, statusLabel }: RaceTimerProps) {
  return (
    <div className="text-right">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Timer</p>
      <motion.p
        key={statusLabel}
        initial={{ opacity: 0.8 }}
        animate={{ opacity: 1 }}
        className="text-3xl font-semibold text-[var(--accent)]"
      >
        {formatDuration(elapsedMs)}
      </motion.p>
      <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">{statusLabel}</p>
    </div>
  );
}
