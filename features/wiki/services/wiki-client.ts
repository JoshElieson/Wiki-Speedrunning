import type { WikiArticle } from "@/types/domain";
import { parseJsonOrThrow } from "@/lib/parse-json-response";
import { normalizeWikiTitle, toWikiTitleKey } from "./title-normalization";

export async function fetchArticle(title: string): Promise<WikiArticle> {
  const response = await fetch(`/api/wiki/article?title=${encodeURIComponent(title)}`);
  return parseJsonOrThrow<WikiArticle>(response, "Failed to fetch article");
}

export function normalizeTitle(title: string): string {
  return normalizeWikiTitle(title);
}

export function titleEquals(left: string, right: string): boolean {
  return toWikiTitleKey(normalizeWikiTitle(left)) === toWikiTitleKey(normalizeWikiTitle(right));
}

export function extractInternalArticleTitle(href: string): string | null {
  if (!href) {
    return null;
  }

  if (href.startsWith("#")) {
    return null;
  }

  const trimmedHref = href.trim();
  const wikiPathPrefix = "/wiki/";
  const wikiUrlPattern = /^https?:\/\/([a-z-]+\.)?wikipedia\.org/i;

  if (trimmedHref.startsWith(wikiPathPrefix)) {
    return decodeWikiPathTitle(trimmedHref.slice(wikiPathPrefix.length));
  }

  if (wikiUrlPattern.test(trimmedHref)) {
    try {
      const parsed = new URL(trimmedHref);
      if (!parsed.pathname.startsWith(wikiPathPrefix)) {
        return null;
      }
      return decodeWikiPathTitle(parsed.pathname.slice(wikiPathPrefix.length));
    } catch {
      return null;
    }
  }

  return null;
}

function decodeWikiPathTitle(raw: string): string | null {
  const withoutQuery = raw.split("?")[0]?.split("#")[0] ?? "";
  if (!withoutQuery || withoutQuery.includes(":")) {
    return null;
  }

  const decoded = decodeURIComponent(withoutQuery).replace(/_/g, " ").trim();
  if (!decoded) {
    return null;
  }

  return decoded;
}

export const fetchWikiArticle = fetchArticle;
