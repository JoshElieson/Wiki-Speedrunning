import type { LeaderboardRow } from "@/types/domain";

export function getLeaderboardPlayerLabel(row: Pick<LeaderboardRow, "username" | "displayName">) {
  const trimmed = row.displayName?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : row.username;
}
