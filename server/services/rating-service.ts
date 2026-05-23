import type { Prisma } from "@prisma/client";
import { DEFAULT_ELO, calculateSoloEloDelta } from "@/lib/elo";
import {
  ALL_ELO_SCOPES,
  isEloScope,
  wikiModeIdFromEloScope,
  WIKIPEDIA_ELO_SCOPE,
} from "@/lib/mode-ratings";
import { prisma } from "@/lib/prisma";

async function recalculateRanks(scope: string) {
  const entries = await prisma.leaderboardEntry.findMany({
    where: { scope },
    orderBy: [{ rating: "desc" }, { createdAt: "asc" }, { id: "asc" }],
  });

  if (entries.length === 0) {
    return;
  }

  await prisma.$transaction(
    entries.map((entry, index) =>
      prisma.leaderboardEntry.update({
        where: { id: entry.id },
        data: { rank: index + 1 },
      }),
    ),
  );
}

export async function refreshLeaderboardStatsForScope(userId: string, scope: string) {
  await ensureDefaultRatings(userId);

  if (!isEloScope(scope)) {
    return;
  }

  const wikiMode = wikiModeIdFromEloScope(scope);

  const completedStats = await prisma.run.aggregate({
    where: {
      userId,
      wikiMode,
      status: "COMPLETED",
    },
    _count: {
      _all: true,
    },
    _min: {
      durationMs: true,
    },
  });

  await prisma.leaderboardEntry.update({
    where: {
      scope_userId: {
        scope,
        userId,
      },
    },
    data: {
      bestScore: completedStats._count._all,
      bestTimeMs: completedStats._min.durationMs ?? null,
    },
  });
}

export async function refreshWikipediaLeaderboardStats(userId: string) {
  await refreshLeaderboardStatsForScope(userId, WIKIPEDIA_ELO_SCOPE);
}

export async function ensureDefaultRatings(userId: string) {
  const existing = await prisma.leaderboardEntry.findMany({
    where: { userId },
    select: { scope: true },
  });
  const existingScopes = new Set(existing.map((entry) => entry.scope));
  const missingScopes = ALL_ELO_SCOPES.filter((scope) => !existingScopes.has(scope));

  if (missingScopes.length === 0) {
    return;
  }

  await prisma.leaderboardEntry.createMany({
    data: missingScopes.map((scope) => ({
      userId,
      scope,
      rank: 0,
      rating: DEFAULT_ELO,
    })),
    skipDuplicates: true,
  });

  await Promise.all(missingScopes.map((scope) => recalculateRanks(scope)));
}

interface ApplyWikipediaMatchEloInput {
  userId: string;
  completed: boolean;
  durationMs?: number;
  clickCount?: number;
  runId?: string;
}

interface ApplySoloMatchEloInput extends ApplyWikipediaMatchEloInput {
  scope: string;
}

export async function applySoloMatchElo({
  userId,
  completed,
  durationMs,
  clickCount,
  runId,
  scope,
}: ApplySoloMatchEloInput): Promise<number> {
  await ensureDefaultRatings(userId);

  const delta = calculateSoloEloDelta({
    completed,
    timeMs: durationMs,
    clicks: clickCount,
  });
  const safeScope = scope && isEloScope(scope) ? scope : WIKIPEDIA_ELO_SCOPE;
  const context = completed ? `${safeScope}_match_completed` : `${safeScope}_match_abandoned`;

  const entry = await prisma.leaderboardEntry.findUnique({
    where: {
      scope_userId: {
        scope: safeScope,
        userId,
      },
    },
  });

  if (!entry) {
    return 0;
  }

  const ratingBefore = entry.rating;
  const ratingAfter = ratingBefore + delta;
  const appliedDelta = ratingAfter - ratingBefore;

  if (appliedDelta === 0) {
    return 0;
  }

  const tx: Prisma.PrismaPromise<unknown>[] = [
    prisma.leaderboardEntry.update({
      where: { id: entry.id },
      data: { rating: ratingAfter },
    }),
    prisma.ratingRecord.create({
      data: {
        userId,
        ratingBefore,
        ratingAfter,
        delta: appliedDelta,
        context,
      },
    }),
  ];
  if (runId) {
    tx.push(
      prisma.run.update({
        where: { id: runId },
        data: { eloDelta: appliedDelta },
      }),
    );
  }
  await prisma.$transaction(tx);

  await recalculateRanks(safeScope);
  return appliedDelta;
}

export async function applyWikipediaMatchElo({
  userId,
  completed,
  durationMs,
  clickCount,
  runId,
}: ApplyWikipediaMatchEloInput): Promise<number> {
  return applySoloMatchElo({
    userId,
    scope: WIKIPEDIA_ELO_SCOPE,
    completed,
    durationMs,
    clickCount,
    runId,
  });
}
