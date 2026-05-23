import type { WikiArticle, WikiArticleLink } from "@/types/domain";
import {
  fetchRandomWikiArticleTitles,
  fetchWikiArticleByTitle,
  getWikiOutgoingLinks,
  isValidWikiOutgoingLink,
} from "./mediawiki-service";

export async function fetchArticleByTitle(rawTitle: string): Promise<WikiArticle> {
  return fetchWikiArticleByTitle("wikipedia", rawTitle);
}

export async function getOutgoingLinks(normalizedTitleOrRaw: string): Promise<WikiArticleLink[]> {
  return getWikiOutgoingLinks("wikipedia", normalizedTitleOrRaw);
}

export async function isValidOutgoingLink(currentTitle: string, candidateNextTitle: string): Promise<boolean> {
  return isValidWikiOutgoingLink("wikipedia", currentTitle, candidateNextTitle);
}

export async function fetchRandomArticleTitles(limit: number): Promise<string[]> {
  return fetchRandomWikiArticleTitles("wikipedia", limit);
}
