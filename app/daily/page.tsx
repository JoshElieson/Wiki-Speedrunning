"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChallengeCard } from "@/components/presentation/challenge-card";
import { VarietyCategoryLogo } from "@/components/profile/variety-category-logo";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/presentation/state-panel";
import { getVarietyCategoryMeta, type ProfileVarietyScope } from "@/lib/profile-elo-categories";
import type {
  ChallengeDescriptor,
  DailyChallengeEntry,
  DailyChallengeMode,
  DailyChallengeSet,
  DailyVarietyChallengeEntry,
} from "@/types/domain";
import { cn } from "@/utils/cn";

const selectClassName =
  "w-full max-w-xs rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]";

const dailyBlockLinkClassName =
  "group relative block space-y-3 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface-elevated)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

const WIKIPEDIA_MODE_HEADINGS: Record<DailyChallengeMode, string> = {
  time: "Daily Speed",
  clicks: "Daily Efficiency",
};

const VARIETY_MODE_CHALLENGE_TITLES: Record<DailyChallengeMode, string> = {
  time: "Daily Speed Challenge",
  clicks: "Daily Efficiency Challenge",
};

function raceHref(challenge: ChallengeDescriptor) {
  const params = new URLSearchParams({
    start: challenge.startTitle,
    target: challenge.targetTitle,
  });
  return `/race?${params.toString()}`;
}

function DailyChallengeSection({
  heading,
  gameLabel,
  challengeSubtitle,
  objective,
  challenge,
  logo,
  headingClassName,
  accentTopBorderClassName,
  accentDotClassName,
}: {
  heading?: string;
  gameLabel?: string;
  challengeSubtitle?: string;
  objective?: string;
  challenge: ChallengeDescriptor;
  logo?: ReactNode;
  headingClassName?: string;
  accentTopBorderClassName?: string;
  accentDotClassName?: string;
}) {
  const hasVarietyTitle = Boolean(logo && gameLabel && challengeSubtitle);
  const title = hasVarietyTitle ? (
    <div className="flex items-center gap-3">
      {logo}
      <div>
        <p className={`text-lg font-semibold leading-tight ${headingClassName}`}>{gameLabel}</p>
        <p className="text-lg font-semibold leading-tight text-[var(--foreground)]">{challengeSubtitle}</p>
      </div>
    </div>
  ) : (
    <h2 className={`text-lg font-semibold text-[var(--foreground)] ${headingClassName ?? ""}`}>{heading}</h2>
  );

  return (
    <Link href={raceHref(challenge)} className={dailyBlockLinkClassName}>
      {accentTopBorderClassName ? (
        <span
          className={cn("pointer-events-none absolute inset-x-0 top-0 h-0.5", accentTopBorderClassName)}
          aria-hidden
        />
      ) : null}
      {accentDotClassName ? (
        <span
          className={cn(
            "pointer-events-none absolute right-4 top-4 h-1.5 w-1.5 rounded-full",
            accentDotClassName,
          )}
          aria-hidden
        />
      ) : null}
      <div className="space-y-1">
        {title}
        {objective ? <p className="text-sm text-[var(--muted)]">{objective}</p> : null}
      </div>
      <ChallengeCard
        challenge={challenge}
        compact
        hideBadges
        hideTitle={hasVarietyTitle}
        interactive={false}
        className="border-0 bg-transparent p-0 shadow-none"
      />
    </Link>
  );
}

function VarietyDailySection({ entries }: { entries: DailyVarietyChallengeEntry[] }) {
  const [selectedScope, setSelectedScope] = useState(entries[0]?.scope ?? "");

  useEffect(() => {
    if (!entries.length) {
      return;
    }
    if (!entries.some((entry) => entry.scope === selectedScope)) {
      setSelectedScope(entries[0].scope);
    }
  }, [entries, selectedScope]);

  const selected = entries.find((entry) => entry.scope === selectedScope) ?? entries[0];
  if (!selected) {
    return null;
  }

  const scope = selected.scope as ProfileVarietyScope;
  const categoryMeta = getVarietyCategoryMeta(scope);
  const sortedChallenges = [...selected.challenges].sort((a, b) => (a.mode === "time" ? -1 : b.mode === "time" ? 1 : 0));

  return (
    <div className="space-y-4">
      <label className="block max-w-xs space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">Game</span>
        <select
          className={selectClassName}
          value={selectedScope}
          onChange={(event) => setSelectedScope(event.target.value)}
        >
          {entries.map((entry) => {
            const label = getVarietyCategoryMeta(entry.scope as ProfileVarietyScope).label;
            return (
              <option key={entry.scope} value={entry.scope}>
                {label}
              </option>
            );
          })}
        </select>
      </label>
      <div className="grid gap-8 lg:grid-cols-2">
        {sortedChallenges.map((entry) => (
          <DailyChallengeSection
            key={entry.mode}
            gameLabel={categoryMeta.label}
            challengeSubtitle={VARIETY_MODE_CHALLENGE_TITLES[entry.mode]}
            objective={entry.objective}
            challenge={entry.challenge}
            logo={<VarietyCategoryLogo scope={scope} badgeClassName={categoryMeta.accent.badgeBg} />}
            headingClassName="text-[var(--foreground)]"
            accentTopBorderClassName={categoryMeta.accent.topBorder}
            accentDotClassName={categoryMeta.accent.dot}
          />
        ))}
      </div>
    </div>
  );
}

function WikipediaDailySection({ entries }: { entries: DailyChallengeEntry[] }) {
  const sorted = [...entries].sort((a, b) => (a.mode === "time" ? -1 : b.mode === "time" ? 1 : 0));

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {sorted.map((entry) => (
        <DailyChallengeSection
          key={entry.mode}
          heading={WIKIPEDIA_MODE_HEADINGS[entry.mode]}
          objective={entry.objective}
          challenge={entry.challenge}
        />
      ))}
    </div>
  );
}

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
  const wikipediaEntries = dailySet?.challenges ?? [];
  const varietyEntries = dailySet?.varietyChallenges ?? [];
  const hasContent = wikipediaEntries.length > 0 || varietyEntries.length > 0;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }}>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">Daily Challenges</h1>
        <p className="mt-2 text-[var(--muted)]">New challenges every day!</p>
      </motion.div>

      <div className="mt-6 space-y-10">
        {query.isLoading ? <LoadingPanel title="Loading daily challenge set" /> : null}
        {query.isError ? <ErrorPanel message="Could not load daily challenges. Try again in a moment." /> : null}

        {wikipediaEntries.length > 0 ? (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="space-y-4"
          >
            <div>
              <h2 className="text-xl font-semibold text-[var(--foreground)]">Wikipedia</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Classic speedruns on the full encyclopedia graph.</p>
            </div>
            <WikipediaDailySection entries={wikipediaEntries} />
          </motion.section>
        ) : null}

        {varietyEntries.length > 0 ? (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="space-y-4"
          >
            <div>
              <h2 className="text-xl font-semibold text-[var(--foreground)]">Variety modes</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Two themed routes per universe each day — speed and efficiency.
              </p>
            </div>
            <VarietyDailySection entries={varietyEntries} />
          </motion.section>
        ) : null}

        {!query.isLoading && !query.isError && !hasContent ? (
          <EmptyPanel title="No challenges available" message="Daily challenge generation is still warming up." />
        ) : null}
      </div>
    </main>
  );
}
