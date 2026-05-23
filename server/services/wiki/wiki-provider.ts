import type { WikiArticle, WikiArticleLink } from "@/types/domain";
import { getWikiModeFromNullable, type WikiId } from "@/lib/wiki-modes";
import {
  fetchRandomWikiArticleTitles,
  fetchWikiArticleByTitle,
  getWikiOutgoingLinks,
  isValidWikiOutgoingLink,
} from "./mediawiki-service";

export async function fetchArticleByTitleForWiki(wikiId: WikiId, rawTitle: string): Promise<WikiArticle> {
  return fetchWikiArticleByTitle(getWikiModeFromNullable(wikiId), rawTitle);
}

export async function isValidOutgoingLinkForWiki(
  wikiId: WikiId,
  currentTitle: string,
  candidateNextTitle: string,
): Promise<boolean> {
  return isValidWikiOutgoingLink(getWikiModeFromNullable(wikiId), currentTitle, candidateNextTitle);
}

export async function getOutgoingLinksForWiki(wikiId: WikiId, normalizedTitleOrRaw: string): Promise<WikiArticleLink[]> {
  return getWikiOutgoingLinks(getWikiModeFromNullable(wikiId), normalizedTitleOrRaw);
}

export async function fetchRandomArticleTitlesForWiki(wikiId: WikiId, limit: number): Promise<string[]> {
  return fetchRandomWikiArticleTitles(getWikiModeFromNullable(wikiId), limit);
}
