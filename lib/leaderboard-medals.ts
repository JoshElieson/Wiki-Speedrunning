export const LEADERBOARD_PODIUM_MEDALS = [
  { rank: 1, label: "1st", medalClass: "text-amber-400", ariaLabel: "1st place" },
  { rank: 2, label: "2nd", medalClass: "text-zinc-300", ariaLabel: "2nd place" },
  { rank: 3, label: "3rd", medalClass: "text-amber-700", ariaLabel: "3rd place" },
] as const;

const MEDAL_BY_RANK = new Map(LEADERBOARD_PODIUM_MEDALS.map((medal) => [medal.rank, medal]));

export function getLeaderboardRankMedal(rank: number) {
  return MEDAL_BY_RANK.get(rank as 1 | 2 | 3);
}

export function isLeaderboardBlueAccentRank(rank: number) {
  return rank >= 4 && rank <= 10;
}

export function getLeaderboardRankLabelClass(rank: number) {
  if (isLeaderboardBlueAccentRank(rank)) {
    return "font-mono font-semibold text-[var(--accent)]";
  }

  return "font-mono text-[var(--muted)]";
}
