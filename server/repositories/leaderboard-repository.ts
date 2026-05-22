import { prisma } from "@/lib/prisma";
import { DEFAULT_LEADERBOARD_SCOPE } from "@/lib/leaderboard-scopes";
import type { LeaderboardRow } from "@/types/domain";

export async function getLeaderboard(scope = DEFAULT_LEADERBOARD_SCOPE, limit = 100): Promise<LeaderboardRow[]> {
  const entries = await prisma.leaderboardEntry.findMany({
    where: { scope },
    include: {
      user: {
        select: {
          username: true,
          displayName: true,
        },
      },
    },
    orderBy: [{ rank: "asc" }, { updatedAt: "desc" }],
    take: limit,
  });

  return entries.map((entry) => ({
    rank: entry.rank,
    username: entry.user.username,
    displayName: entry.user.displayName,
    rating: entry.rating,
    bestTimeMs: entry.bestTimeMs ?? 0,
    runs: entry.bestScore ?? 0,
  }));
}

export async function getLeaderboardEntryForUser(
  userId: string,
  scope = DEFAULT_LEADERBOARD_SCOPE,
): Promise<{ rank: number; rating: number } | null> {
  const entry = await prisma.leaderboardEntry.findUnique({
    where: {
      scope_userId: {
        scope,
        userId,
      },
    },
    select: {
      rank: true,
      rating: true,
    },
  });

  if (!entry) {
    return null;
  }

  return { rank: entry.rank, rating: entry.rating };
}
