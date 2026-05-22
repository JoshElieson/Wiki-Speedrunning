"use client";

import { motion } from "framer-motion";
import type { RouteNode } from "../types/race-state";

interface RouteTrailProps {
  routeHistory: RouteNode[];
}

export function RouteTrail({ routeHistory }: RouteTrailProps) {
  if (!routeHistory.length) {
    return <p className="text-sm text-[var(--muted)]">Your route will appear here as you navigate.</p>;
  }

  return (
    <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto">
      {routeHistory.map((node, index) => (
        <motion.span
          layout
          key={`${node.title}-${node.visitedAtOffsetMs}`}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1 text-xs text-[var(--foreground)]"
        >
          {index + 1}. {node.title}
        </motion.span>
      ))}
    </div>
  );
}
