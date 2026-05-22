import type { Prisma } from "@prisma/client";
import { DEFAULT_ELO, calculateSoloEloDelta } from "@/lib/elo";
import {
  PROFILE_VARIETY_SCOPES,
  WIKIPEDIA_ELO_SCOPE,
} from "@/lib/profile-elo-categories";
import { prisma } from "@/lib/prisma";

const DEFAULT_RATING_SCOPES = [WIKIPEDIA_ELO_SCOPE, ...PROFILE_VARIETY_SCOPES] as const;

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

export async function refreshWikipediaLeaderboardStats(userId: string) {
  await ensureDefaultRatings(userId);

  const completedStats = await prisma.run.aggregate({
    where: {
      userId,
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
        scope: WIKIPEDIA_ELO_SCOPE,
        userId,
      },
    },
    data: {
      bestScore: completedStats._count._all,
      bestTimeMs: completedStats._min.durationMs ?? null,
    },
  });
}

export async function ensureDefaultRatings(userId: string) {
  const existing = await prisma.leaderboardEntry.findMany({
    where: { userId },
    select: { scope: true },
  });
  const existingScopes = new Set(existing.map((entry) => entry.scope));
  const missingScopes = DEFAULT_RATING_SCOPES.filter((scope) => !existingScopes.has(scope));

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

export async function applyWikipediaMatchElo({
  userId,
  completed,
  durationMs,
  clickCount,
  runId,
}: ApplyWikipediaMatchEloInput): Promise<number> {
  await ensureDefaultRatings(userId);

  const delta = calculateSoloEloDelta({
    completed,
    timeMs: durationMs,
    clicks: clickCount,
  });
  const context = completed ? "wikipedia_match_completed" : "wikipedia_match_abandoned";

  const entry = await prisma.leaderboardEntry.findUnique({
    where: {
      scope_userId: {
        scope: WIKIPEDIA_ELO_SCOPE,
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

  await recalculateRanks(WIKIPEDIA_ELO_SCOPE);

  return appliedDelta;
}
