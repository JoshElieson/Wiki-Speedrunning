import { REDIS_KEYS } from "@/db/constants";
import { ApiError } from "@/server/errors/api-error";
import { cache } from "@/server/cache/cache";
import type { WikiArticle, WikiArticleLink } from "@/types/domain";
import { isLikelyArticleTitle, normalizeWikiTitle } from "./title-normalization";

const WIKIPEDIA_API_BASE = "https://en.wikipedia.org/w/api.php";
const ARTICLE_CACHE_TTL_SECONDS = 10 * 60;
const LINKS_CACHE_TTL_SECONDS = 10 * 60;

type WikipediaPage = {
  pageid?: number;
  title?: string;
  extract?: string;
  fullurl?: string;
  links?: Array<{ title?: string }>;
  missing?: boolean;
};

type WikipediaQueryResponse = {
  query?: {
    pages?: Record<string, WikipediaPage>;
    redirects?: Array<{ from: string; to: string }>;
  };
  error?: {
    code: string;
    info: string;
  };
};

async function fetchWikipediaJson(params: URLSearchParams): Promise<WikipediaQueryResponse> {
  const response = await fetch(`${WIKIPEDIA_API_BASE}?${params.toString()}`, {
    headers: { "User-Agent": "WikiRush/1.0 (portfolio project)" },
    next: { revalidate: ARTICLE_CACHE_TTL_SECONDS },
  });

  if (!response.ok) {
    throw new ApiError(502, "WIKIPEDIA_HTTP_ERROR", `Wikipedia API responded with ${response.status}`);
  }

  const payload = (await response.json()) as WikipediaQueryResponse;
  if (payload.error) {
    throw new ApiError(502, "WIKIPEDIA_API_ERROR", payload.error.info, payload.error);
  }

  return payload;
}

function dedupeAndFilterLinks(links: Array<{ title?: string }> | undefined): WikiArticleLink[] {
  const byNormalized = new Map<string, WikiArticleLink>();
  for (const link of links ?? []) {
    if (!link.title) {
      continue;
    }

    const normalized = normalizeWikiTitle(link.title);
    if (!isLikelyArticleTitle(normalized)) {
      continue;
    }

    if (!byNormalized.has(normalized)) {
      byNormalized.set(normalized, {
        title: link.title,
        normalizedTitle: normalized,
      });
    }
  }
  return Array.from(byNormalized.values());
}

function buildArticleFromPage(page: WikipediaPage): WikiArticle {
  if (!page.title) {
    throw new ApiError(404, "ARTICLE_NOT_FOUND", "Article not found");
  }

  const normalizedTitle = normalizeWikiTitle(page.title);
  const links = dedupeAndFilterLinks(page.links);
  return {
    title: page.title,
    normalizedTitle,
    extract: page.extract?.trim() || "No summary available.",
    links,
    pageId: page.pageid,
    url: page.fullurl ?? `https://en.wikipedia.org/wiki/${normalizedTitle}`,
  };
}

export async function fetchArticleByTitle(rawTitle: string): Promise<WikiArticle> {
  const normalizedInputTitle = normalizeWikiTitle(rawTitle);
  if (!normalizedInputTitle) {
    throw new ApiError(400, "INVALID_TITLE", "Article title is required");
  }

  const articleCacheKey = REDIS_KEYS.article(normalizedInputTitle.toLowerCase());
  const cachedArticle = await cache.get<WikiArticle>(articleCacheKey);
  if (cachedArticle) {
    return cachedArticle;
  }

  const query = new URLSearchParams({
    action: "query",
    prop: "extracts|info|links",
    exintro: "1",
    explaintext: "1",
    inprop: "url",
    plnamespace: "0",
    pllimit: "max",
    redirects: "1",
    format: "json",
    origin: "*",
    titles: normalizedInputTitle,
  });

  const payload = await fetchWikipediaJson(query);
  const page = payload.query?.pages ? Object.values(payload.query.pages)[0] : undefined;
  if (!page || page.missing) {
    throw new ApiError(404, "ARTICLE_NOT_FOUND", "Article not found");
  }

  const article = buildArticleFromPage(page);
  const canonicalCacheKey = REDIS_KEYS.article(article.normalizedTitle.toLowerCase());

  await Promise.all([
    cache.set(articleCacheKey, article, ARTICLE_CACHE_TTL_SECONDS),
    cache.set(canonicalCacheKey, article, ARTICLE_CACHE_TTL_SECONDS),
    cache.set(REDIS_KEYS.links(article.normalizedTitle.toLowerCase()), article.links, LINKS_CACHE_TTL_SECONDS),
  ]);

  return article;
}

export async function getOutgoingLinks(normalizedTitleOrRaw: string): Promise<WikiArticleLink[]> {
  const normalizedTitle = normalizeWikiTitle(normalizedTitleOrRaw);
  const linksCacheKey = REDIS_KEYS.links(normalizedTitle.toLowerCase());
  const cached = await cache.get<WikiArticleLink[]>(linksCacheKey);
  if (cached) {
    return cached;
  }

  const article = await fetchArticleByTitle(normalizedTitle);
  return article.links;
}

export async function isValidOutgoingLink(currentTitle: string, candidateNextTitle: string): Promise<boolean> {
  const normalizedNextTitle = normalizeWikiTitle(candidateNextTitle);
  const outgoingLinks = await getOutgoingLinks(currentTitle);
  return outgoingLinks.some((link) => link.normalizedTitle === normalizedNextTitle);
}
