import { getWikiModeConfig, getWikiModeId } from "@/lib/wiki-modes";
import { wikipediaWikiMode } from "@/lib/wiki-modes/modes/wikipedia";

export const normalizeWikiTitle = wikipediaWikiMode.normalizePageTitle;
export const toWikiTitleKey = wikipediaWikiMode.toPageTitleKey;

export function normalizeTitleForWiki(rawTitle: string, wikiId?: string | null): string {
  return getWikiModeConfig(getWikiModeId(wikiId)).normalizePageTitle(rawTitle);
}

export function toTitleKeyForWiki(rawTitle: string, wikiId?: string | null): string {
  return getWikiModeConfig(getWikiModeId(wikiId)).toPageTitleKey(rawTitle);
}

export function raceTargetMatchesForWiki(
  visitedTitle: string,
  targetTitle: string,
  wikiId?: string | null,
  canonicalTitle?: string | null,
): boolean {
  return getWikiModeConfig(getWikiModeId(wikiId)).matchesRaceTarget(visitedTitle, targetTitle, canonicalTitle);
}

export function stripWikiDisambiguation(title: string): string {
  const stripped = title.replace(/\s+\([^)]+\)\s*$/, "").trim();
  return stripped || title;
}

export const raceTargetTitleMatches = wikipediaWikiMode.matchesRaceTarget;
export const isLikelyArticleTitle = wikipediaWikiMode.isAllowedPageTitle;
