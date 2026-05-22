"use client";

import { motion } from "framer-motion";

export function RoutePathChips({ path }: { path: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {path.map((node, index) => (
        <motion.div
          key={`${node}-${index}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.25 }}
          className="flex items-center gap-2"
        >
          <span className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-1.5 text-xs text-[var(--foreground)]">
            {node}
          </span>
          {index < path.length - 1 ? <span className="text-xs text-[var(--muted)]">→</span> : null}
        </motion.div>
      ))}
    </div>
  );
}
