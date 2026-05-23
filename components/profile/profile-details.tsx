"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { ErrorPanel, LoadingPanel } from "@/components/presentation/state-panel";
import { StatCard } from "@/components/presentation/stat-card";
import { RunHistoryPanel } from "@/components/profile/run-history-panel";
import { EditableDisplayName, isOwnProfile } from "@/components/profile/profile-settings";
import type { ProfileSnapshot } from "@/types/domain";
import { formatDuration } from "@/utils/format";
import { cn } from "@/utils/cn";
import { isEloScope } from "@/lib/mode-ratings";
import type { ProfileVarietyScope } from "@/lib/profile-elo-categories";
import { VarietyCategoryCard } from "@/components/profile/variety-category-card";

type ProfileTab = "overview" | "history";

const PROFILE_TABS: Array<{ id: ProfileTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "history", label: "Match History" },
];

export function ProfileDetails({ username }: { username: string }) {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const ownProfile = isOwnProfile(username, session?.user?.username);
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const query = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => {
      const response = await fetch(`/api/profile/${username}`);
      if (!response.ok) throw new Error("Failed to load profile");
      return (await response.json()) as ProfileSnapshot;
    },
    enabled: Boolean(username),
  });

  const profile = query.data;
  const headingLabel = profile?.displayName?.trim() ? profile.displayName : username;
  const tabParam = searchParams.get("tab");

  useEffect(() => {
    if (tabParam === "history" || tabParam === "overview") {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-4"
      >
        {profile?.avatarUrl ? (
          <Image
            src={profile.avatarUrl}
            alt=""
            width={72}
            height={72}
            className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-full object-cover"
            unoptimized
          />
        ) : (
          <span className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-2xl font-medium text-[var(--foreground)]">
            {headingLabel.charAt(0).toUpperCase()}
          </span>
        )}
        <div>
          {profile && ownProfile ? (
            <EditableDisplayName username={profile.username} displayName={profile.displayName} />
          ) : (
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">{headingLabel}</h1>
          )}
          <p className="mt-2 text-sm text-[var(--muted)]">@{username}</p>
        </div>
      </motion.div>

      <nav
        aria-label="Profile sections"
        className="mt-6 inline-flex flex-wrap gap-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-1"
      >
        {PROFILE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-[var(--radius-sm)] px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-[var(--surface-elevated)] text-[var(--foreground)] shadow-[var(--shadow-soft)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="mt-6 min-h-[12rem]">
        {query.isLoading ? <LoadingPanel title="Loading profile" /> : null}
        {query.isError ? <ErrorPanel message="Could not load this player profile." /> : null}

        {profile && activeTab === "overview" ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-8"
          >
            <section>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Stats</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Wikipedia ELO Rating"
                  value={String(profile.rating)}
                  hint="Competitive rating"
                  delay={0.05}
                />
                <StatCard
                  label="Best Time"
                  value={formatDuration(profile.bestTimeMs)}
                  hint="Fastest completion"
                  delay={0.1}
                />
                <StatCard
                  label="Total Runs"
                  value={String(profile.totalRuns)}
                  hint="Completed and abandoned"
                  delay={0.15}
                />
                <StatCard label="Wins" value={String(profile.wins)} hint="Top placements" delay={0.2} />
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Variety Categories</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Per-universe ELO ratings.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {profile.categoryElos.map((category, index) => {
                  const scope = category.scope;
                  const modeStats =
                    isEloScope(scope) && profile.statsByMode ? profile.statsByMode[scope] : null;
                  const runsLabel =
                    modeStats && modeStats.completedRuns > 0
                      ? `${modeStats.completedRuns} completed run${modeStats.completedRuns === 1 ? "" : "s"}`
                      : undefined;
                  const bestTimeLabel =
                    modeStats && modeStats.bestTimeMs > 0
                      ? `Best ${formatDuration(modeStats.bestTimeMs)}`
                      : undefined;
                  const subtitle = [runsLabel, bestTimeLabel].filter(Boolean).join(" · ") || undefined;

                  return (
                    <VarietyCategoryCard
                      key={category.scope}
                      scope={category.scope as ProfileVarietyScope}
                      name={category.label}
                      elo={category.rating}
                      subtitle={subtitle}
                      delay={0.25 + index * 0.04}
                    />
                  );
                })}
              </div>
            </section>
          </motion.div>
        ) : null}

        {profile && activeTab === "history" ? (
          <motion.section
            id="match-history"
            key="history"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <RunHistoryPanel runs={profile.recentRuns} />
          </motion.section>
        ) : null}

      </div>
    </>
  );
}
