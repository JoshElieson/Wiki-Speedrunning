import { REDIS_KEYS } from "@/db/constants";
import { mergeLeaderboardWithDummyPlayers } from "@/lib/dummy-players";
import { DEFAULT_LEADERBOARD_SCOPE, type LeaderboardScope } from "@/lib/leaderboard-scopes";
import { cache } from "@/server/cache/cache";
import {
  getLeaderboard,
  getLeaderboardEntryForUser,
} from "@/server/repositories/leaderboard-repository";
import type { LeaderboardRow } from "@/types/domain";

const LEADERBOARD_CACHE_SECONDS = 60;

export async function fetchLeaderboard(scope = DEFAULT_LEADERBOARD_SCOPE, limit = 100): Promise<LeaderboardRow[]> {
  const cacheKey = `${REDIS_KEYS.leaderboard(scope)}:${limit}:display-names:dummy-padded`;
  const cached = await cache.get<LeaderboardRow[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const rows = mergeLeaderboardWithDummyPlayers(await getLeaderboard(scope, limit), scope as LeaderboardScope, limit);
  await cache.set(cacheKey, rows, LEADERBOARD_CACHE_SECONDS);
  return rows;
}

export async function fetchViewerLeaderboardStats(
  userId: string,
  scope = DEFAULT_LEADERBOARD_SCOPE,
): Promise<{ rank: number; rating: number } | null> {
  return getLeaderboardEntryForUser(userId, scope);
}
