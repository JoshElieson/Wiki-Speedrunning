import { DEFAULT_ELO } from "@/lib/elo";
import {
  PROFILE_VARIETY_CATEGORIES,
  WIKIPEDIA_ELO_SCOPE,
} from "@/lib/profile-elo-categories";
import { LEADERBOARD_SCOPES, type LeaderboardScope } from "@/lib/leaderboard-scopes";
import type { LeaderboardRow, ProfileSnapshot } from "@/types/domain";

export const DUMMY_LEADERBOARD_LIMIT = 100;

const USERNAME_PREFIXES = [
  "wiki",
  "link",
  "page",
  "graph",
  "route",
  "cite",
  "hop",
  "dash",
  "speed",
  "click",
] as const;

const USERNAME_SUFFIXES = [
  "sprinter",
  "runner",
  "master",
  "hawk",
  "fox",
  "bolt",
  "ace",
  "pro",
  "knight",
  "sage",
] as const;

const CHALLENGE_LABELS = [
  "Daily Sprint",
  "Ranked Ladder",
  "Wiki Rush",
  "Speed Gauntlet",
  "Variety Vault",
  "Universe Hop",
  "Article Blitz",
  "Route Royale",
] as const;

const ROUTE_ARTICLES = [
  "Albert Einstein",
  "World War II",
  "Python (programming language)",
  "Solar System",
  "New York City",
  "Machine learning",
  "Ancient Rome",
  "Pacific Ocean",
  "Leonardo da Vinci",
  "Internet",
] as const;

export type DummyPlayer = {
  username: string;
  displayName: string;
  avatarUrl: string;
  ratingsByScope: Record<LeaderboardScope, number>;
  bestTimeMs: number;
  runs: number;
  wins: number;
  recentRuns: ProfileSnapshot["recentRuns"];
};

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function capitalize(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function scopeRating(scope: LeaderboardScope, playerIndex: number): number {
  const base = 2190 - playerIndex * 7;
  const jitter = (hashString(`${scope}:${playerIndex}`) % 241) - 120;
  return Math.max(DEFAULT_ELO, Math.min(2400, base + jitter));
}

function buildRecentRuns(playerIndex: number, username: string): ProfileSnapshot["recentRuns"] {
  const runCount = 14 + (playerIndex % 5);
  const now = Date.now();

  return Array.from({ length: runCount }, (_, runIndex) => {
    const completed = runIndex % 6 !== 0;
    const durationMs = 38_000 + playerIndex * 380 + runIndex * 1_150 + (hashString(`${username}:${runIndex}`) % 4_200);
    const clickCount = 4 + ((playerIndex + runIndex) % 9);
    const routeLength = 3 + ((playerIndex + runIndex) % 4);

    return {
      id: `dummy-run-${username}-${runIndex}`,
      challengeLabel: CHALLENGE_LABELS[(playerIndex + runIndex) % CHALLENGE_LABELS.length],
      status: completed ? "COMPLETED" : "ABANDONED",
      durationMs,
      clickCount,
      score: Math.max(0, 1_200 - durationMs / 40 + clickCount * 8),
      difficultyScore: 55 + ((playerIndex + runIndex) % 35),
      route: Array.from({ length: routeLength }, (_, stepIndex) => {
        return ROUTE_ARTICLES[(playerIndex + runIndex + stepIndex) % ROUTE_ARTICLES.length];
      }),
      createdAt: new Date(now - (runIndex + 1) * 86_400_000).toISOString(),
    };
  });
}

function buildDummyPlayer(index: number): DummyPlayer {
  const prefix = USERNAME_PREFIXES[index % USERNAME_PREFIXES.length];
  const suffix = USERNAME_SUFFIXES[Math.floor(index / USERNAME_PREFIXES.length) % USERNAME_SUFFIXES.length];
  const username = `${prefix}${suffix}`.toLowerCase();
  const displayName = `${capitalize(prefix)} ${capitalize(suffix)}`;
  const ratingsByScope = Object.fromEntries(
    LEADERBOARD_SCOPES.map((scope) => [scope, scopeRating(scope, index)]),
  ) as Record<LeaderboardScope, number>;

  const bestTimeMs = 34_000 + index * 410 + (hashString(username) % 3_800);
  const runs = Math.max(12, 210 - index * 2);
  const wins = Math.max(1, Math.floor(runs * (0.08 + (DUMMY_LEADERBOARD_LIMIT - index) / 900)));

  return {
    username,
    displayName,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(username)}&size=144`,
    ratingsByScope,
    bestTimeMs,
    runs,
    wins,
    recentRuns: buildRecentRuns(index, username),
  };
}

const DUMMY_PLAYERS: DummyPlayer[] = Array.from({ length: DUMMY_LEADERBOARD_LIMIT }, (_, index) =>
  buildDummyPlayer(index),
);

const DUMMY_PLAYER_BY_USERNAME = new Map(DUMMY_PLAYERS.map((player) => [player.username, player]));

export function isDummyUsername(username: string) {
  return DUMMY_PLAYER_BY_USERNAME.has(username.trim().toLowerCase());
}

export function getDummyPlayer(username: string): DummyPlayer | null {
  return DUMMY_PLAYER_BY_USERNAME.get(username.trim().toLowerCase()) ?? null;
}

export function getDummyLeaderboardRows(scope: LeaderboardScope, limit = DUMMY_LEADERBOARD_LIMIT): LeaderboardRow[] {
  return [...DUMMY_PLAYERS]
    .sort((a, b) => b.ratingsByScope[scope] - a.ratingsByScope[scope])
    .slice(0, limit)
    .map((player, index) => ({
      rank: index + 1,
      username: player.username,
      displayName: player.displayName,
      rating: player.ratingsByScope[scope],
      bestTimeMs: player.bestTimeMs,
      runs: player.runs,
    }));
}

export function mergeLeaderboardWithDummyPlayers(
  realRows: LeaderboardRow[],
  scope: LeaderboardScope,
  limit = DUMMY_LEADERBOARD_LIMIT,
): LeaderboardRow[] {
  if (realRows.length >= limit) {
    return realRows.slice(0, limit);
  }

  const realUsernames = new Set(realRows.map((row) => row.username));
  const fillerRows = getDummyLeaderboardRows(scope, limit).filter((row) => !realUsernames.has(row.username));
  const combined = [...realRows, ...fillerRows].slice(0, limit);

  return combined
    .sort((a, b) => b.rating - a.rating)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function getDummyProfileSnapshot(username: string): ProfileSnapshot | null {
  const player = getDummyPlayer(username);
  if (!player) {
    return null;
  }

  return {
    username: player.username,
    displayName: player.displayName,
    avatarUrl: player.avatarUrl,
    rating: player.ratingsByScope[WIKIPEDIA_ELO_SCOPE],
    categoryElos: PROFILE_VARIETY_CATEGORIES.map((category) => ({
      scope: category.scope,
      label: category.label,
      rating: player.ratingsByScope[category.scope],
    })),
    bestTimeMs: player.bestTimeMs,
    totalRuns: player.runs,
    wins: player.wins,
    recentRuns: player.recentRuns,
  };
}
