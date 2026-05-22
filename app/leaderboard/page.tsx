"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { LeaderboardRow } from "@/components/presentation/leaderboard-row";
import { StatCard } from "@/components/presentation/stat-card";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/presentation/state-panel";
import { Card } from "@/components/ui/card";
import type { LeaderboardRow as LeaderboardRowType } from "@/types/domain";

export default function LeaderboardPage() {
  const query = useQuery({
    queryKey: ["leaderboard", "global"],
    queryFn: async () => {
      const response = await fetch("/api/leaderboard");
      if (!response.ok) throw new Error("Failed to load leaderboard");
      return (await response.json()) as { rows: LeaderboardRowType[] };
    },
  });

  const rows = query.data?.rows ?? [];
  const top = rows[0];

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">Global Leaderboard</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Compare ladder placement by speed, consistency, and route quality.</p>
      </motion.div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Top Player" value={top?.username ?? "-"} hint="Current #1 on ladder" delay={0.05} />
        <StatCard label="Top Rating" value={top ? String(top.rating) : "-"} hint="Peak tracked skill index" delay={0.1} />
        <StatCard label="Tracked Competitors" value={String(rows.length)} hint="Visible this season" delay={0.15} />
      </div>

      <Card className="mt-6 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--surface-elevated)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Best Time</th>
              <th className="px-4 py-3">Runs</th>
            </tr>
          </thead>
          <motion.tbody layout>
            {rows.map((row, index) => (
              <LeaderboardRow key={row.username} row={row} index={index} />
            ))}
          </motion.tbody>
        </table>
      </Card>

      {query.isLoading ? <div className="mt-4"><LoadingPanel title="Loading leaderboard" /></div> : null}
      {query.isError ? <div className="mt-4"><ErrorPanel message="Could not load leaderboard data. Please refresh." /></div> : null}
      {!query.isLoading && !query.isError && rows.length === 0 ? (
        <div className="mt-4">
          <EmptyPanel title="No rankings yet" message="Complete a run to seed the first ladder entries." />
        </div>
      ) : null}
    </main>
  );
}
