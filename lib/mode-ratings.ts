import { DEFAULT_ELO } from "@/lib/elo";
import { LEADERBOARD_SCOPES, type LeaderboardScope } from "@/lib/leaderboard-scopes";
import { PROFILE_VARIETY_SCOPES, WIKIPEDIA_ELO_SCOPE } from "@/lib/profile-elo-categories";
import { getWikiModeConfig, type WikiModeId } from "@/lib/wiki-modes";

export const ALL_ELO_SCOPES = LEADERBOARD_SCOPES;
export type EloScope = LeaderboardScope;

export interface ModeRunStats {
  wins: number;
  losses: number;
  completedRuns: number;
  bestTimeMs: number;
  bestClicks: number | null;
}

export type EloByMode = Record<EloScope, number>;
export type StatsByMode = Record<EloScope, ModeRunStats>;

export function isEloScope(value: string): value is EloScope {
  return (LEADERBOARD_SCOPES as readonly string[]).includes(value);
}

export function eloScopeFromWikiModeId(modeId: WikiModeId): EloScope {
  return getWikiModeConfig(modeId).eloScope;
}

export function wikiModeIdFromEloScope(scope: EloScope): WikiModeId {
  return scope as WikiModeId;
}

export function createDefaultEloByMode(): EloByMode {
  return Object.fromEntries(LEADERBOARD_SCOPES.map((scope) => [scope, DEFAULT_ELO])) as EloByMode;
}

export function createDefaultStatsByMode(): StatsByMode {
  return Object.fromEntries(
    LEADERBOARD_SCOPES.map((scope) => [
      scope,
      {
        wins: 0,
        losses: 0,
        completedRuns: 0,
        bestTimeMs: 0,
        bestClicks: null,
      },
    ]),
  ) as StatsByMode;
}

export function buildEloByMode(
  entries: Array<{ scope: string; rating: number }>,
  fallbackRating = DEFAULT_ELO,
): EloByMode {
  const result = createDefaultEloByMode();
  for (const entry of entries) {
    if (isEloScope(entry.scope)) {
      result[entry.scope] = entry.rating;
    }
  }
  for (const scope of LEADERBOARD_SCOPES) {
    if (result[scope] === DEFAULT_ELO && entries.length === 0) {
      result[scope] = fallbackRating;
    }
  }
  return result;
}

/** Scopes shown as variety cards on profile (excludes Wikipedia). */
export const PROFILE_VARIETY_ELO_SCOPES = PROFILE_VARIETY_SCOPES;

export { WIKIPEDIA_ELO_SCOPE };
