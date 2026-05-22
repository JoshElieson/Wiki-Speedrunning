"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { LeaderboardRow as LeaderboardRowType } from "@/types/domain";
import { formatDuration } from "@/utils/format";

export function LeaderboardRow({ row, index }: { row: LeaderboardRowType; index: number }) {
  return (
    <motion.tr
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, delay: index * 0.03 }}
      className="border-t border-[var(--border)] text-[var(--foreground)] transition-colors hover:bg-[var(--surface-elevated)]"
    >
      <td className="px-4 py-3 font-mono text-[var(--muted)]">#{row.rank}</td>
      <td className="px-4 py-3">
        <Link href={`/profile/${row.username}`} className="font-medium text-[var(--foreground)] hover:text-[var(--accent)]">
          {row.username}
        </Link>
      </td>
      <td className="px-4 py-3">{row.rating}</td>
      <td className="px-4 py-3">{formatDuration(row.bestTimeMs)}</td>
      <td className="px-4 py-3">{row.runs}</td>
    </motion.tr>
  );
}
