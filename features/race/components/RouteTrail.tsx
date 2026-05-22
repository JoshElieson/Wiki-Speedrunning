"use client";

import { motion } from "framer-motion";
import type { RouteNode } from "../types/race-state";

interface RouteTrailProps {
  route: RouteNode[];
}

export function RouteTrail({ route }: RouteTrailProps) {
  if (!route.length) {
    return <p className="text-sm text-[var(--muted)]">Your route will appear here as you navigate.</p>;
  }

  return (
    <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto">
      {route.map((node, index) => (
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
