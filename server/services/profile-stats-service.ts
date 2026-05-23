import {
  buildEloByMode,
  createDefaultStatsByMode,
  eloScopeFromWikiModeId,
  isEloScope,
  type EloByMode,
  type StatsByMode,
  WIKIPEDIA_ELO_SCOPE,
} from "@/lib/mode-ratings";
import { getWikiModeId } from "@/lib/wiki-modes";
import { PROFILE_VARIETY_CATEGORIES } from "@/lib/profile-elo-categories";
import { prisma } from "@/lib/prisma";
import type { ProfileCategoryElo, ProfileSnapshot } from "@/types/domain";
import type { RunHistoryItem } from "@/server/types/run-history";

export type ProfileRunAggregate = {
  wikiMode: string;
  status: string;
  _count: { _all: number };
  _min: { durationMs: number | null; clickCount: number | null };
};

function buildStatsByModeFromRuns(aggregates: ProfileRunAggregate[]): StatsByMode {
  const stats = createDefaultStatsByMode();

  for (const row of aggregates) {
    let scope: string;
    try {
      scope = eloScopeFromWikiModeId(getWikiModeId(row.wikiMode));
    } catch {
      scope = row.wikiMode;
    }
    if (!isEloScope(scope)) {
      continue;
    }

    const modeStats = stats[scope];
    if (row.status === "COMPLETED") {
      modeStats.completedRuns += row._count._all;
      modeStats.wins += row._count._all;
      const bestTime = row._min.durationMs;
      const bestClicks = row._min.clickCount;
      if (bestTime !== null && (modeStats.bestTimeMs === 0 || bestTime < modeStats.bestTimeMs)) {
        modeStats.bestTimeMs = bestTime;
      }
      if (
        bestClicks !== null &&
        (modeStats.bestClicks === null || bestClicks < modeStats.bestClicks)
      ) {
        modeStats.bestClicks = bestClicks;
      }
    } else if (row.status === "ABANDONED") {
      modeStats.losses += row._count._all;
    }
  }

  return stats;
}

export function buildProfileSnapshot(params: {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  ratingEntries: Array<{
    scope: string;
    rating: number;
    bestTimeMs: number | null;
    bestScore: number | null;
  }>;
  runAggregates: ProfileRunAggregate[];
  totalRuns: number;
  recentRuns: RunHistoryItem[];
}): ProfileSnapshot {
  const eloByMode = buildEloByMode(params.ratingEntries);
  let statsByMode = buildStatsByModeFromRuns(params.runAggregates);

  for (const entry of params.ratingEntries) {
    if (!isEloScope(entry.scope)) {
      continue;
    }
    const modeStats = statsByMode[entry.scope];
    if (modeStats.completedRuns === 0 && entry.bestScore) {
      modeStats.completedRuns = entry.bestScore;
      modeStats.wins = entry.bestScore;
    }
    if (modeStats.bestTimeMs === 0 && entry.bestTimeMs) {
      modeStats.bestTimeMs = entry.bestTimeMs;
    }
  }

  const wikipediaStats = statsByMode[WIKIPEDIA_ELO_SCOPE];
  const categoryElos: ProfileCategoryElo[] = PROFILE_VARIETY_CATEGORIES.map((category) => ({
    scope: category.scope,
    label: category.label,
    rating: eloByMode[category.scope],
  }));

  return {
    username: params.username,
    displayName: params.displayName,
    avatarUrl: params.avatarUrl,
    rating: eloByMode[WIKIPEDIA_ELO_SCOPE],
    eloByMode,
    statsByMode,
    categoryElos,
    bestTimeMs: wikipediaStats.bestTimeMs,
    totalRuns: params.totalRuns,
    wins: wikipediaStats.wins,
    recentRuns: params.recentRuns.map((run) => ({
      id: run.id,
      challengeLabel: run.challengeLabel,
      status: run.status,
      durationMs: run.finalElapsedMs,
      clickCount: run.clickCount,
      score: run.score,
      eloDelta: run.eloDelta,
      difficultyScore: run.difficultyScore,
      route: run.route,
      createdAt: run.completedAt,
    })),
  };
}

export async function loadProfileStatsForUser(userId: string) {
  const [ratingEntries, runAggregates, totalRuns] = await Promise.all([
    prisma.leaderboardEntry.findMany({
      where: { userId },
      select: {
        scope: true,
        rating: true,
        bestTimeMs: true,
        bestScore: true,
      },
    }),
    prisma.run.groupBy({
      by: ["wikiMode", "status"],
      where: { userId },
      _count: { _all: true },
      _min: { durationMs: true, clickCount: true },
    }),
    prisma.run.count({ where: { userId } }),
  ]);

  return {
    ratingEntries,
    runAggregates: runAggregates as ProfileRunAggregate[],
    totalRuns,
    eloByMode: buildEloByMode(ratingEntries) satisfies EloByMode,
  };
}
