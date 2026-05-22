"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ChallengeCard } from "@/components/presentation/challenge-card";
import { StatCard } from "@/components/presentation/stat-card";
import { Badge } from "@/components/ui/badge";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/presentation/state-panel";
import type { DailyChallengeSet } from "@/types/domain";

export default function DailyPage() {
  const query = useQuery({
    queryKey: ["daily"],
    queryFn: async () => {
      const response = await fetch("/api/daily");
      if (!response.ok) throw new Error("Failed to load daily challenges");
      return (await response.json()) as DailyChallengeSet;
    },
  });

  const dailySet = query.data;
  const entries = dailySet?.challenges ?? [];

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }}>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">Daily Challenges</h1>
        <p className="mt-2 text-[var(--muted)]">
          Two new Wikipedia races every day: one for fastest time, one for fewest clicks.
        </p>
      </motion.div>

      {dailySet ? (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <StatCard label="Date Seed" value={dailySet.dateKey} hint="Resets at UTC midnight" delay={0.06} />
          <StatCard label="Daily Modes" value={String(entries.length)} hint="Time + Clicks" delay={0.12} />
          <StatCard
            label="Distinct Routes"
            value={String(new Set(entries.map((entry) => `${entry.challenge.startTitle}::${entry.challenge.targetTitle}`)).size)}
            hint="No duplicate pairings"
            delay={0.18}
          />
        </div>
      ) : null}

      <div className="mt-6">
        {query.isLoading ? <LoadingPanel title="Loading daily challenge set" /> : null}
        {query.isError ? <ErrorPanel message="Could not load daily challenges. Try again in a moment." /> : null}
        {entries.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {entries.map((entry) => (
              <section key={entry.mode} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-zinc-100">
                    {entry.mode === "time" ? "Fastest Time Challenge" : "Fewest Clicks Challenge"}
                  </h2>
                  <Badge variant={entry.mode === "time" ? "purple" : "default"}>
                    {entry.mode === "time" ? "Time Mode" : "Clicks Mode"}
                  </Badge>
                </div>
                <p className="text-sm text-zinc-400">{entry.objective}</p>
                <ChallengeCard challenge={entry.challenge} compact />
              </section>
            ))}
          </div>
        ) : null}
        {!query.isLoading && !query.isError && entries.length === 0 ? (
          <EmptyPanel title="No challenges available" message="Daily challenge generation is still warming up." />
        ) : null}
      </div>
    </main>
  );
}
