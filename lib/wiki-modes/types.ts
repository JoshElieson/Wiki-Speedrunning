import type { LeaderboardScope } from "@/lib/leaderboard-scopes";
import type { ProfileVarietyScope } from "@/lib/profile-elo-categories";

/** Canonical wiki mode ids — align with leaderboard / ELO scopes. */
export const WIKI_MODE_IDS = [
  "wikipedia",
  "minecraft",
  "league",
  "pokemon",
  "star-wars",
  "marvel",
] as const;

export type WikiModeId = (typeof WIKI_MODE_IDS)[number];

/** Legacy API / DB field name; same values as {@link WikiModeId} plus aliases like `starwars`. */
export type WikiId = WikiModeId | "starwars";

export const SUPPORTED_WIKI_IDS = [...WIKI_MODE_IDS, "starwars"] as const;

export type WikiModeEloScope = "wikipedia" | ProfileVarietyScope;

export interface WikiModeAccent {
  topBorder: string;
  badgeBg: string;
  dot: string;
  heroText: string;
}

export interface WikiModeReaderPresentation {
  styleSheetHref?: string;
  styleSheetHrefs?: string[];
  articleSubtitle: string;
  iframeTitlePrefix: string;
}

/**
 * Per-wiki behavior plugged into the shared race lifecycle.
 * Register new modes in `lib/wiki-modes/modes/` and `lib/wiki-modes/server/registry.ts`.
 */
export interface WikiModeConfig {
  id: WikiModeId;
  displayName: string;
  asciiName?: string;
  shortName?: string;
  description: string;
  raceLabel: string;
  articleSubtitle: string;
  baseUrl: string;
  apiEndpoint: string;
  enabled: boolean;
  eloScope: WikiModeEloScope;
  /** @deprecated Use `eloScope` — kept for run-service compatibility. */
  leaderboardScope: WikiModeEloScope;
  accent: WikiModeAccent;
  icon?: string;
  tags: string[];
  ctaLabel: string;
  reader: WikiModeReaderPresentation;

  articlePathPrefixes: string[];
  internalHostPattern: RegExp;
  blockedTitlePrefixes: readonly string[];
  blockedPathPrefixes?: readonly string[];

  articleApiPath: string;
  randomChallengeApiPath: string;

  defaultStartTitle: string;
  defaultTargetTitle: string;
  fallbackChallengeLabel: string;
  randomChallengeLabel: string;
  emergencyChallengeId: string;

  normalizePageTitle: (rawTitle: string) => string;
  toPageTitleKey: (rawTitle: string) => string;
  extractTitleFromHref: (href: string) => string | null;
  isAllowedPageTitle: (normalizedTitle: string) => boolean;
  matchesRaceTarget: (visitedTitle: string, targetTitle: string, canonicalTitle?: string | null) => boolean;
  isInternalLinkHref: (href: string) => boolean;
  buildArticleUrl: (normalizedTitle: string) => string;
  formatTitleForRaceUrl: (title: string) => string;
  parseTitleFromRaceUrl: (raw: string) => string;
  runLabel: string;
  rateLimitErrorMessage: string;
}

export function wikiModeIdToLeaderboardScope(modeId: WikiModeId): LeaderboardScope {
  return modeId as LeaderboardScope;
}
