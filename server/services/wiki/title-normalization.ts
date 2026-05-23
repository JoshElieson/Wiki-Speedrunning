import { wikipediaWikiMode } from "@/lib/wiki-modes/modes/wikipedia";

export const normalizeWikiTitle = wikipediaWikiMode.normalizePageTitle;
export const toWikiTitleKey = wikipediaWikiMode.toPageTitleKey;

export function stripWikiDisambiguation(title: string): string {
  const stripped = title.replace(/\s+\([^)]+\)\s*$/, "").trim();
  return stripped || title;
}

export const raceTargetTitleMatches = wikipediaWikiMode.matchesRaceTarget;
export const isLikelyArticleTitle = wikipediaWikiMode.isAllowedPageTitle;
