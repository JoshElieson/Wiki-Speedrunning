import type { WikiArticle } from "@/types/domain";
import { parseJsonOrThrow } from "@/lib/parse-json-response";
import { getWikiMode, resolveWikiModeId, type WikiModeId } from "@/lib/wiki-modes";

export async function fetchArticleForMode(modeId: WikiModeId, title: string): Promise<WikiArticle> {
  const mode = getWikiMode(modeId);
  const params = new URLSearchParams({ title, wikiId: mode.id });
  const response = await fetch(`${mode.articleApiPath}?${params.toString()}`);
  return parseJsonOrThrow<WikiArticle>(response, "Failed to fetch article");
}

export async function fetchArticle(title: string, modeId: WikiModeId = "wikipedia"): Promise<WikiArticle> {
  return fetchArticleForMode(resolveWikiModeId(modeId), title);
}

export function normalizeTitle(title: string, modeId: WikiModeId = "wikipedia"): string {
  return getWikiMode(resolveWikiModeId(modeId)).normalizePageTitle(title);
}

export function titleEquals(left: string, right: string, modeId: WikiModeId = "wikipedia"): boolean {
  const mode = getWikiMode(resolveWikiModeId(modeId));
  return mode.toPageTitleKey(mode.normalizePageTitle(left)) === mode.toPageTitleKey(mode.normalizePageTitle(right));
}

export function reachedRaceTarget(
  visitedTitle: string,
  targetTitle: string,
  canonicalTitle?: string | null,
  modeId: WikiModeId = "wikipedia",
): boolean {
  return getWikiMode(resolveWikiModeId(modeId)).matchesRaceTarget(visitedTitle, targetTitle, canonicalTitle);
}

export function extractInternalArticleTitle(href: string, modeId: WikiModeId = "wikipedia"): string | null {
  return getWikiMode(resolveWikiModeId(modeId)).extractTitleFromHref(href);
}

export const fetchWikiArticle = (title: string) => fetchArticleForMode("wikipedia", title);
