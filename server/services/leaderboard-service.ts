import { REDIS_KEYS } from "@/db/constants";
import { cache } from "@/server/cache/cache";
import { getLeaderboard } from "@/server/repositories/leaderboard-repository";
import type { LeaderboardRow } from "@/types/domain";

const LEADERBOARD_CACHE_SECONDS = 60;

export async function fetchLeaderboard(scope = "global", limit = 100): Promise<LeaderboardRow[]> {
  const cacheKey = `${REDIS_KEYS.leaderboard(scope)}:${limit}`;
  const cached = await cache.get<LeaderboardRow[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const rows = await getLeaderboard(scope, limit);
  await cache.set(cacheKey, rows, LEADERBOARD_CACHE_SECONDS);
  return rows;
}
