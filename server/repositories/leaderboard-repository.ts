import { prisma } from "@/lib/prisma";
import { DEFAULT_LEADERBOARD_SCOPE } from "@/lib/leaderboard-scopes";
import { isEloScope, wikiModeIdFromEloScope } from "@/lib/mode-ratings";
import type { LeaderboardRow } from "@/types/domain";

export async function getLeaderboard(scope = DEFAULT_LEADERBOARD_SCOPE, limit = 100): Promise<LeaderboardRow[]> {
  const safeScope = isEloScope(scope) ? scope : DEFAULT_LEADERBOARD_SCOPE;
  const wikiMode = wikiModeIdFromEloScope(safeScope);

  const entries = await prisma.leaderboardEntry.findMany({
    where: { scope: safeScope },
    include: {
      user: {
        select: {
          username: true,
          displayName: true,
        },
      },
    },
    orderBy: [{ rating: "desc" }, { createdAt: "asc" }, { id: "asc" }],
    take: limit,
  });

  const userIds = entries.map((entry) => entry.userId);
  const completedStats =
    userIds.length > 0
      ? await prisma.run.groupBy({
          by: ["userId"],
          where: {
            userId: { in: userIds },
            wikiMode,
            status: "COMPLETED",
          },
          _count: {
            _all: true,
          },
          _min: {
            durationMs: true,
          },
        })
      : [];

  const completedStatsByUserId = new Map(
    completedStats.map((stat) => [
      stat.userId,
      {
        completedRuns: stat._count._all,
        bestTimeMs: stat._min.durationMs ?? 0,
      },
    ]),
  );

  return entries.map((entry, index) => {
    const stats = completedStatsByUserId.get(entry.userId);
    return {
      rank: index + 1,
      username: entry.user.username,
      displayName: entry.user.displayName,
      rating: entry.rating,
      bestTimeMs: stats?.bestTimeMs ?? entry.bestTimeMs ?? 0,
      runs: stats?.completedRuns ?? entry.bestScore ?? 0,
    };
  });
}

export async function getLeaderboardEntryForUser(
  userId: string,
  scope = DEFAULT_LEADERBOARD_SCOPE,
): Promise<{ rank: number; rating: number } | null> {
  const safeScope = isEloScope(scope) ? scope : DEFAULT_LEADERBOARD_SCOPE;

  const entry = await prisma.leaderboardEntry.findUnique({
    where: {
      scope_userId: {
        scope: safeScope,
        userId,
      },
    },
    select: {
      id: true,
      createdAt: true,
      rating: true,
    },
  });

  if (!entry) {
    return null;
  }

  const aheadCount = await prisma.leaderboardEntry.count({
    where: {
      scope: safeScope,
      OR: [
        { rating: { gt: entry.rating } },
        {
          AND: [{ rating: entry.rating }, { createdAt: { lt: entry.createdAt } }],
        },
        {
          AND: [{ rating: entry.rating }, { createdAt: entry.createdAt }, { id: { lt: entry.id } }],
        },
      ],
    },
  });

  return { rank: aheadCount + 1, rating: entry.rating };
}
