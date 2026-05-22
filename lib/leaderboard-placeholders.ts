import {
  DUMMY_LEADERBOARD_LIMIT,
  mergeLeaderboardWithDummyPlayers,
} from "@/lib/dummy-players";
import type { LeaderboardScope } from "@/lib/leaderboard-scopes";
import type { LeaderboardRow } from "@/types/domain";

/** Pads the ladder to the top 100 with preview players until real data fills the board. */
export function withLeaderboardPlaceholders(
  rows: LeaderboardRow[],
  scope: LeaderboardScope,
  limit = DUMMY_LEADERBOARD_LIMIT,
): LeaderboardRow[] {
  if (rows.length >= limit) {
    return rows.slice(0, limit);
  }

  return mergeLeaderboardWithDummyPlayers(rows, scope, limit);
}
