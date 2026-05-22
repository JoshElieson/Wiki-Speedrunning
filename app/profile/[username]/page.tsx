"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArticleCard } from "@/components/presentation/article-card";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/presentation/state-panel";
import { StatCard } from "@/components/presentation/stat-card";
import type { ProfileSnapshot } from "@/types/domain";
import { formatDuration } from "@/utils/format";

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params.username;

  const query = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => {
      const response = await fetch(`/api/profile/${username}`);
      if (!response.ok) throw new Error("Failed to load profile");
      return (await response.json()) as ProfileSnapshot;
    },
  });

  const profile = query.data;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">{username}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Competitive stats and recent route outcomes.</p>
      </motion.div>

      {profile ? (
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <StatCard label="Rating" value={String(profile.rating)} hint="Skill index" delay={0.05} />
          <StatCard label="Best Time" value={formatDuration(profile.bestTimeMs)} hint="Fastest completion" delay={0.1} />
          <StatCard label="Total Runs" value={String(profile.totalRuns)} hint="Tracked submissions" delay={0.15} />
          <StatCard label="Wins" value={String(profile.wins)} hint="Top placements" delay={0.2} />
        </div>
      ) : null}

      <div className="mt-6">
        {query.isLoading ? <LoadingPanel title="Loading profile" /> : null}
        {query.isError ? <ErrorPanel message="Could not load this player profile." /> : null}
        {!query.isLoading && !query.isError && profile && profile.recentRuns.length === 0 ? (
          <EmptyPanel title="No runs yet" message="Complete a run to build this profile timeline." />
        ) : null}
      </div>

      {profile ? (
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Recent Runs</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {profile.recentRuns.map((run) => (
              <Link key={run.id} href={`/runs/${run.id}`}>
                <ArticleCard
                  title={run.challengeLabel}
                  description={`${formatDuration(run.durationMs)} · ${run.clickCount} clicks`}
                  meta={new Date(run.createdAt).toLocaleString()}
                />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
