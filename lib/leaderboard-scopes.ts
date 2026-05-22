export const LEADERBOARD_SCOPES = [
  "wikipedia",
  "minecraft",
  "league",
  "pokemon",
  "star-wars",
  "marvel",
] as const;

export type LeaderboardScope = (typeof LEADERBOARD_SCOPES)[number];

export const DEFAULT_LEADERBOARD_SCOPE: LeaderboardScope = "wikipedia";

export const LEADERBOARD_SCOPE_LABELS: Record<LeaderboardScope, string> = {
  wikipedia: "Wikipedia",
  minecraft: "Minecraft",
  league: "League of Legends",
  pokemon: "Pokemon",
  "star-wars": "Star Wars",
  marvel: "Marvel",
};
