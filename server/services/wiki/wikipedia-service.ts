import { REDIS_KEYS } from "@/db/constants";
import { ApiError } from "@/server/errors/api-error";
import { cache } from "@/server/cache/cache";
import type { WikiArticle, WikiArticleLink } from "@/types/domain";
import { isLikelyArticleTitle, normalizeWikiTitle, toWikiTitleKey } from "./title-normalization";
import sanitizeHtml from "sanitize-html";

const WIKIPEDIA_API_BASE = "https://en.wikipedia.org/w/api.php";
const ARTICLE_CACHE_TTL_SECONDS = 10 * 60;
const LINKS_CACHE_TTL_SECONDS = 10 * 60;
const WIKI_RENDER_CACHE_VERSION = "v2";

type WikipediaPage = {
  pageid?: number;
  title?: string;
  extract?: string;
  fullurl?: string;
  links?: Array<{ title?: string }>;
  missing?: boolean;
};

type WikipediaParseResponse = {
  parse?: {
    title?: string;
    pageid?: number;
    displaytitle?: string;
    text?: {
      "*": string;
    };
    links?: Array<{
      ns?: number;
      exists?: string;
      "*": string;
    }>;
  };
  error?: {
    code: string;
    info: string;
  };
};

type WikipediaParseLink = {
  ns?: number;
  exists?: string;
  "*": string;
};

type WikipediaQueryResponse = {
  query?: {
    pages?: Record<string, WikipediaPage>;
    redirects?: Array<{ from: string; to: string }>;
    random?: Array<{ id?: number; ns?: number; title?: string }>;
  };
  continue?: {
    rncontinue?: string;
    continue?: string;
  };
  error?: {
    code: string;
    info: string;
  };
};

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "abbr",
    "annotation",
    "p",
    "a",
    "b",
    "bdi",
    "br",
    "cite",
    "i",
    "em",
    "strong",
    "small",
    "sup",
    "sub",
    "blockquote",
    "ul",
    "ol",
    "li",
    "dl",
    "dt",
    "dd",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "caption",
    "code",
    "pre",
    "figure",
    "figcaption",
    "img",
    "q",
    "span",
    "div",
    "math",
    "semantics",
    "mstyle",
    "mrow",
    "mspace",
    "mfrac",
    "msqrt",
    "msub",
    "msup",
    "msubsup",
    "mover",
    "mroot",
    "mtable",
    "mtr",
    "mtd",
    "mi",
    "mn",
    "mo",
    "mtext",
    "style",
    "link",
    "meta",
  ],
  allowedAttributes: {
    a: ["href", "title", "rel", "class", "id"],
    img: ["src", "srcset", "sizes", "alt", "width", "height", "loading", "decoding", "class", "id"],
    table: ["class", "id", "style"],
    th: ["scope", "colspan", "rowspan", "class", "id", "style"],
    td: ["colspan", "rowspan", "class", "id", "style"],
    span: ["class", "id", "style", "lang", "dir"],
    div: ["class", "id", "style", "lang", "dir", "role"],
    math: ["xmlns", "display", "class", "id", "style"],
    "*": [
      "class",
      "id",
      "style",
      "title",
      "lang",
      "dir",
      "role",
      "aria-hidden",
      "aria-label",
      "aria-labelledby",
      "data-ct-options",
      "data-file-height",
      "data-file-width",
      "data-mw-group",
      "data-mw-deduplicate",
      "typeof",
    ],
    link: ["rel", "href", "type", "media"],
    meta: ["charset", "name", "content", "property"],
  },
  disallowedTagsMode: "discard",
  parser: {
    lowerCaseTags: true,
  },
  allowedSchemes: ["http", "https", "data"],
};

async function fetchWikipediaJson<T extends WikipediaQueryResponse | WikipediaParseResponse>(params: URLSearchParams): Promise<T> {
  const response = await fetch(`${WIKIPEDIA_API_BASE}?${params.toString()}`, {
    headers: { "User-Agent": "Wikipedia Speedrunning Ranked/1.0 (portfolio project)" },
    next: { revalidate: ARTICLE_CACHE_TTL_SECONDS },
  });

  if (!response.ok) {
    throw new ApiError(502, "WIKIPEDIA_HTTP_ERROR", `Wikipedia API responded with ${response.status}`);
  }

  const payload = (await response.json()) as T;
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

    const normalizedKey = toWikiTitleKey(normalized);
    if (!byNormalized.has(normalizedKey)) {
      byNormalized.set(normalizedKey, {
        title: normalized.replace(/_/g, " "),
        normalizedTitle: normalized,
      });
    }
  }
  return Array.from(byNormalized.values());
}

function dedupeAndFilterParseLinks(links: WikipediaParseLink[] | undefined): WikiArticleLink[] {
  const byNormalized = new Map<string, WikiArticleLink>();
  for (const link of links ?? []) {
    if (!link || typeof link["*"] !== "string") {
      continue;
    }

    if (link.ns !== 0 || link.exists === undefined) {
      continue;
    }

    const normalized = normalizeWikiTitle(link["*"]);
    if (!isLikelyArticleTitle(normalized)) {
      continue;
    }

    const normalizedKey = toWikiTitleKey(normalized);
    if (!byNormalized.has(normalizedKey)) {
      byNormalized.set(normalizedKey, {
        title: normalized.replace(/_/g, " "),
        normalizedTitle: normalized,
      });
    }
  }

  return Array.from(byNormalized.values());
}

function stripHtmlText(value: string | undefined): string {
  if (!value) {
    return "";
  }

  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function fetchArticleHtmlByTitle(normalizedInputTitle: string): Promise<{
  html: string;
  displayTitle: string;
  links: WikiArticleLink[];
}> {
  const parseQuery = new URLSearchParams({
    action: "parse",
    page: normalizedInputTitle,
    prop: "text|displaytitle|links",
    format: "json",
    origin: "*",
  });

  const payload = await fetchWikipediaJson<WikipediaParseResponse>(parseQuery);
  const htmlSource = payload.parse?.text?.["*"] ?? "";
  const sanitizedHtml = sanitizeHtml(htmlSource, SANITIZE_OPTIONS);
  const links = dedupeAndFilterParseLinks(payload.parse?.links);
  const displayTitle = stripHtmlText(payload.parse?.displaytitle) || normalizedInputTitle.replace(/_/g, " ");

  return {
    html: sanitizedHtml,
    displayTitle,
    links,
  };
}

function buildArticleFromPage(
  page: WikipediaPage,
  htmlPayload: { html: string; displayTitle: string; links: WikiArticleLink[] },
): WikiArticle {
  if (!page.title) {
    throw new ApiError(404, "ARTICLE_NOT_FOUND", "Article not found");
  }

  const normalizedTitle = normalizeWikiTitle(page.title);
  const fallbackLinks = dedupeAndFilterLinks(page.links);
  const links = htmlPayload.links.length > 0 ? htmlPayload.links : fallbackLinks;
  return {
    title: page.title,
    normalizedTitle,
    displayTitle: htmlPayload.displayTitle,
    html: htmlPayload.html,
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

  const cacheTitleKey = `${WIKI_RENDER_CACHE_VERSION}:${normalizedInputTitle.toLowerCase()}`;
  const articleCacheKey = REDIS_KEYS.article(cacheTitleKey);
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

  const payload = await fetchWikipediaJson<WikipediaQueryResponse>(query);
  const page = payload.query?.pages ? Object.values(payload.query.pages)[0] : undefined;
  if (!page || page.missing) {
    throw new ApiError(404, "ARTICLE_NOT_FOUND", "Article not found");
  }

  const htmlPayload = await fetchArticleHtmlByTitle(normalizedInputTitle);
  const article = buildArticleFromPage(page, htmlPayload);
  const canonicalCacheKey = REDIS_KEYS.article(`${WIKI_RENDER_CACHE_VERSION}:${article.normalizedTitle.toLowerCase()}`);

  await Promise.all([
    cache.set(articleCacheKey, article, ARTICLE_CACHE_TTL_SECONDS),
    cache.set(canonicalCacheKey, article, ARTICLE_CACHE_TTL_SECONDS),
    cache.set(REDIS_KEYS.links(`${WIKI_RENDER_CACHE_VERSION}:${article.normalizedTitle.toLowerCase()}`), article.links, LINKS_CACHE_TTL_SECONDS),
  ]);

  return article;
}

export async function getOutgoingLinks(normalizedTitleOrRaw: string): Promise<WikiArticleLink[]> {
  const normalizedTitle = normalizeWikiTitle(normalizedTitleOrRaw);
  const linksCacheKey = REDIS_KEYS.links(`${WIKI_RENDER_CACHE_VERSION}:${normalizedTitle.toLowerCase()}`);
  const cached = await cache.get<WikiArticleLink[]>(linksCacheKey);
  if (cached) {
    return cached;
  }

  const article = await fetchArticleByTitle(normalizedTitle);
  return article.links;
}

export async function isValidOutgoingLink(currentTitle: string, candidateNextTitle: string): Promise<boolean> {
  const normalizedNextTitleKey = toWikiTitleKey(candidateNextTitle);
  const outgoingLinks = await getOutgoingLinks(currentTitle);
  return outgoingLinks.some((link) => toWikiTitleKey(link.normalizedTitle) === normalizedNextTitleKey);
}

export async function fetchRandomArticleTitles(limit: number): Promise<string[]> {
  const boundedLimit = Math.max(1, Math.floor(limit));
  const titles: string[] = [];
  const seen = new Set<string>();
  let rncontinue: string | undefined;
  let attempts = 0;

  while (titles.length < boundedLimit && attempts < 40) {
    attempts += 1;
    const remaining = boundedLimit - titles.length;
    const batchSize = Math.min(500, remaining);
    const query = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      list: "random",
      rnnamespace: "0",
      rnfilterredir: "nonredirects",
      rnlimit: String(batchSize),
    });

    if (rncontinue) {
      query.set("rncontinue", rncontinue);
    }

    const payload = await fetchWikipediaJson<WikipediaQueryResponse>(query);
    const randomPages = payload.query?.random ?? [];
    for (const page of randomPages) {
      if (!page.title) {
        continue;
      }
      const normalized = normalizeWikiTitle(page.title);
      if (!isLikelyArticleTitle(normalized)) {
        continue;
      }
      const key = toWikiTitleKey(normalized);
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      titles.push(normalized.replace(/_/g, " "));
      if (titles.length >= boundedLimit) {
        break;
      }
    }

    const nextContinue = payload.continue?.rncontinue;
    if (!nextContinue || nextContinue === rncontinue) {
      break;
    }
    rncontinue = nextContinue;
  }

  return titles;
}
