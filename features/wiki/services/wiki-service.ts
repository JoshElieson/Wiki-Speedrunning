import { normalizeWikiTitle } from "@/server/services/wiki/title-normalization";
import { fetchArticleByTitle, isValidOutgoingLink } from "@/server/services/wiki/wikipedia-service";

export { fetchArticleByTitle, normalizeWikiTitle };

export async function isValidInternalLink(targetTitle: string, availableLinks: { normalizedTitle: string }[]) {
  const normalized = normalizeWikiTitle(targetTitle);
  return availableLinks.some((link) => link.normalizedTitle === normalized);
}

export { isValidOutgoingLink };
