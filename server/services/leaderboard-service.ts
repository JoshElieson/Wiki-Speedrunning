import { DEFAULT_LEADERBOARD_SCOPE } from "@/lib/leaderboard-scopes";
import {
  getLeaderboard,
  getLeaderboardEntryForUser,
} from "@/server/repositories/leaderboard-repository";
import type { LeaderboardRow } from "@/types/domain";

export async function fetchLeaderboard(scope = DEFAULT_LEADERBOARD_SCOPE, limit = 100): Promise<LeaderboardRow[]> {
  // Keep this path uncached so profile/leaderboard stats reflect newly completed runs immediately.
  return getLeaderboard(scope, limit);
}

export async function fetchViewerLeaderboardStats(
  userId: string,
  scope = DEFAULT_LEADERBOARD_SCOPE,
): Promise<{ rank: number; rating: number } | null> {
  return getLeaderboardEntryForUser(userId, scope);
}
