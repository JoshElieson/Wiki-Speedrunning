"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { LeaderboardPodium } from "@/components/presentation/leaderboard-podium";
import { LeaderboardRow } from "@/components/presentation/leaderboard-row";
import { StatCard } from "@/components/presentation/stat-card";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/presentation/state-panel";
import { LeaderboardModePicker } from "@/components/presentation/leaderboard-mode-picker";
import { Card } from "@/components/ui/card";
import {
  DEFAULT_LEADERBOARD_SCOPE,
  LEADERBOARD_SCOPES,
  type LeaderboardScope,
} from "@/lib/leaderboard-scopes";
import type { LeaderboardResponse } from "@/server/types/api";
import type { LeaderboardRow as LeaderboardRowType } from "@/types/domain";

const LEADERBOARD_MODE_STORAGE_KEY = "leaderboard:selectedScope";

function formatViewerRank(rank: number | undefined) {
  if (rank === undefined || rank <= 0) {
    return "—";
  }
  return `#${rank}`;
}

export default function LeaderboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [selectedScope, setSelectedScope] = useState<LeaderboardScope>(DEFAULT_LEADERBOARD_SCOPE);
  const query = useQuery({
    queryKey: ["leaderboard", selectedScope, session?.user?.id ?? "anonymous"],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const scopeQuery = encodeURIComponent(selectedScope);
      const response = await fetch(`/api/leaderboard?scope=${scopeQuery}`);
      if (!response.ok) throw new Error("Failed to load leaderboard");
      return (await response.json()) as LeaderboardResponse;
    },
  });

  const rows = query.data?.rows ?? [];
  const topThree = rows.slice(0, 3);
  const isSignedIn = sessionStatus === "authenticated" && Boolean(session?.user);
  const viewer = query.data?.viewer;
  const yourRating = isSignedIn ? (viewer ? String(viewer.rating) : "—") : "—";
  const yourRanking = isSignedIn ? formatViewerRank(viewer?.rank) : "—";
  const signedOutHint = "Sign in to see your ladder stats";
  const signedInNoEntryHint = "Complete a run to appear on the ladder";

  useEffect(() => {
    const storedScope = window.localStorage.getItem(LEADERBOARD_MODE_STORAGE_KEY);
    if (!storedScope) {
      return;
    }

    if (LEADERBOARD_SCOPES.includes(storedScope as LeaderboardScope)) {
      setSelectedScope(storedScope as LeaderboardScope);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LEADERBOARD_MODE_STORAGE_KEY, selectedScope);
  }, [selectedScope]);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">Global Leaderboard</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Compare ladder placement by speed, consistency, and route quality.</p>
      </motion.div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-stretch">
        <div className="flex h-full min-h-0 flex-col">
          <LeaderboardPodium players={topThree} delay={0.05} />
        </div>
        <div className="flex min-h-0 flex-col gap-4">
          <div className="grid shrink-0 gap-4 sm:grid-cols-2">
            <StatCard
              label="Your rating"
              value={yourRating}
              hint={isSignedIn ? (viewer ? undefined : signedInNoEntryHint) : signedOutHint}
              delay={0.1}
            />
            <StatCard
              label="Your ranking"
              value={yourRanking}
              hint={isSignedIn ? (viewer?.rank ? undefined : signedInNoEntryHint) : signedOutHint}
              delay={0.15}
            />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.28 }}
            className="flex min-h-0 flex-1"
          >
            <Card className="flex w-full flex-1 flex-col p-5">
              <p className="shrink-0 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Game mode</p>
              <div className="mt-3 flex min-h-0 flex-1 flex-col">
                <LeaderboardModePicker selectedScope={selectedScope} onSelectScope={setSelectedScope} />
              </div>
            </Card>
          </motion.div>
        </div>
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
            {rows.map((row: LeaderboardRowType, index: number) => (
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
