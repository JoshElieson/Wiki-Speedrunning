import { prisma } from "@/lib/prisma";
import type { LeaderboardRow } from "@/types/domain";

export async function getLeaderboard(scope = "global", limit = 100): Promise<LeaderboardRow[]> {
  const entries = await prisma.leaderboardEntry.findMany({
    where: { scope },
    include: {
      user: {
        select: {
          username: true,
        },
      },
    },
    orderBy: [{ rank: "asc" }, { updatedAt: "desc" }],
    take: limit,
  });

  return entries.map((entry) => ({
    rank: entry.rank,
    username: entry.user.username,
    rating: entry.rating,
    bestTimeMs: entry.bestTimeMs ?? 0,
    runs: entry.bestScore ?? 0,
  }));
}
