import sanitizeHtml from "sanitize-html";

import { REDIS_KEYS } from "@/db/constants";
import { getWikiMode } from "@/lib/wiki-modes";
import { cache } from "@/server/cache/cache";
import { ApiError } from "@/server/errors/api-error";
import type { WikiArticle, WikiArticleLink } from "@/types/domain";

import { isLikelyArticleTitle, normalizeWikiTitle, toWikiTitleKey } from "./title-normalization";

const STARWARS_API_BASE = "https://starwars.fandom.com/api.php";
const STARWARS_CACHE_PREFIX = "starwars:v3";
const ARTICLE_CACHE_TTL_SECONDS = 10 * 60;
const LINKS_CACHE_TTL_SECONDS = 10 * 60;

type StarWarsPage = {
  pageid?: number;
  title?: string;
  extract?: string;
  fullurl?: string;
  links?: Array<{ title?: string }>;
  missing?: boolean;
};

type StarWarsParseLink = {
  ns?: number;
  exists?: string;
  "*": string;
};

type StarWarsParseResponse = {
  parse?: {
    title?: string;
    pageid?: number;
    displaytitle?: string;
    text?: { "*": string };
    links?: StarWarsParseLink[];
  };
  error?: {
    code: string;
    info: string;
  };
};

type StarWarsQueryResponse = {
  query?: {
    pages?: Record<string, StarWarsPage>;
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

const STARWARS_STRIP_SELECTORS = [
  "mw-editsection",
  "reference-edit",
  "portable-infobox__edit",
  "wikia-ad",
  "ad-slot",
  "gpt-ad",
  "comment",
  "comments",
  "recirculation",
  "recommendation",
  "fandom-community-header",
  "fandom-sticky-header",
  "global-navigation",
  "global-explore",
  "explore-navigation",
  "explore-feed",
  "explore-page",
  "explorecard",
  "license-description",
  "site-notice",
  "lightboxmodal",
  "wds-modal",
  "wds-dialog",
  "wds-overlay",
  "notifications",
];

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
    "picture",
    "aside",
    "section",
    "header",
    "footer",
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
    "sup",
    "hr",
  ],
  allowedAttributes: {
    a: ["href", "title", "rel", "class", "id"],
    img: [
      "src",
      "srcset",
      "sizes",
      "alt",
      "width",
      "height",
      "loading",
      "decoding",
      "class",
      "id",
      "style",
      "data-src",
      "data-srcset",
    ],
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
      "data-file-height",
      "data-file-width",
      "data-mw-group",
      "data-mw-deduplicate",
      "data-source",
      "data-item-name",
      "data-unknown",
      "data-*-*",
      "data-*",
      "typeof",
    ],
    picture: ["class", "id"],
    aside: ["class", "id", "role", "style"],
    section: ["class", "id", "role", "style"],
    header: ["class", "id", "style"],
    footer: ["class", "id", "style"],
    source: ["srcset", "sizes", "type", "media", "data-srcset"],
    link: ["rel", "href", "type", "media"],
    meta: ["charset", "name", "content", "property"],
  },
  disallowedTagsMode: "discard",
  parser: { lowerCaseTags: true },
  allowedSchemes: ["http", "https", "data"],
  exclusiveFilter: (frame) => {
    const className = frame.attribs.class ?? "";
    const id = frame.attribs.id ?? "";
    const haystack = `${className} ${id}`.toLowerCase();
    return STARWARS_STRIP_SELECTORS.some((token) => haystack.includes(token));
  },
};

const STARWARS_DISALLOWED_PREFIXES = getWikiMode("star-wars").blockedTitlePrefixes.map((prefix) =>
  prefix.toUpperCase(),
);

function isLikelyStarWarsArticleTitle(rawTitle: string): boolean {
  const normalized = normalizeWikiTitle(rawTitle);
  if (!normalized || !isLikelyArticleTitle(normalized)) {
    return false;
  }

  const upper = normalized.toUpperCase();
  return !STARWARS_DISALLOWED_PREFIXES.some((prefix) => upper.startsWith(prefix));
}

async function fetchStarWarsJson<T extends StarWarsQueryResponse | StarWarsParseResponse>(params: URLSearchParams): Promise<T> {
  const response = await fetch(`${STARWARS_API_BASE}?${params.toString()}`, {
    headers: { "User-Agent": "Wikipedia Speedrunning Ranked/1.0 (portfolio project)" },
    next: { revalidate: ARTICLE_CACHE_TTL_SECONDS },
  });

  if (!response.ok) {
    throw new ApiError(502, "STARWARS_HTTP_ERROR", `Wookieepedia API responded with ${response.status}`);
  }

  const payload = (await response.json()) as T;
  if (payload.error) {
    throw new ApiError(502, "STARWARS_API_ERROR", payload.error.info, payload.error);
  }

  return payload;
}

function isPlaceholderImageSrc(src: string): boolean {
  return (
    !src ||
    src.startsWith("data:image/") ||
    src.endsWith("/blank.gif") ||
    src.endsWith("/placeholder.png")
  );
}

function hydrateFandomLazyImages(html: string): string {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const dataSrcMatch = tag.match(/\bdata-src="([^"]+)"/i);
    if (!dataSrcMatch) {
      return tag;
    }

    const srcMatch = tag.match(/\bsrc="([^"]*)"/i);
    const currentSrc = srcMatch?.[1] ?? "";
    if (!isPlaceholderImageSrc(currentSrc)) {
      return tag;
    }

    if (srcMatch) {
      return tag.replace(/\bsrc="[^"]*"/i, `src="${dataSrcMatch[1]}"`);
    }

    return tag.replace(/<img\b/i, `<img src="${dataSrcMatch[1]}"`);
  });
}

function stripHtmlText(value: string | undefined): string {
  if (!value) {
    return "";
  }

  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function dedupeLinks(links: Array<{ title?: string }> | undefined): WikiArticleLink[] {
  const map = new Map<string, WikiArticleLink>();
  for (const link of links ?? []) {
    if (!link.title || !isLikelyStarWarsArticleTitle(link.title)) {
      continue;
    }
    const normalized = normalizeWikiTitle(link.title);
    const key = toWikiTitleKey(normalized);
    if (!map.has(key)) {
      map.set(key, { title: normalized.replace(/_/g, " "), normalizedTitle: normalized });
    }
  }
  return Array.from(map.values());
}

function dedupeParseLinks(links: StarWarsParseLink[] | undefined): WikiArticleLink[] {
  const map = new Map<string, WikiArticleLink>();
  for (const link of links ?? []) {
    if (!link || typeof link["*"] !== "string") {
      continue;
    }
    if (link.ns !== 0 || link.exists === undefined) {
      continue;
    }
    if (!isLikelyStarWarsArticleTitle(link["*"])) {
      continue;
    }
    const normalized = normalizeWikiTitle(link["*"]);
    const key = toWikiTitleKey(normalized);
    if (!map.has(key)) {
      map.set(key, { title: normalized.replace(/_/g, " "), normalizedTitle: normalized });
    }
  }
  return Array.from(map.values());
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
  const payload = await fetchStarWarsJson<StarWarsParseResponse>(parseQuery);
  const htmlSource = payload.parse?.text?.["*"] ?? "";
  const sanitizedHtml = hydrateFandomLazyImages(sanitizeHtml(htmlSource, SANITIZE_OPTIONS));
  const links = dedupeParseLinks(payload.parse?.links);
  const displayTitle = stripHtmlText(payload.parse?.displaytitle) || normalizedInputTitle.replace(/_/g, " ");

  return {
    html: sanitizedHtml,
    displayTitle,
    links,
  };
}

export async function fetchArticleByTitle(rawTitle: string): Promise<WikiArticle> {
  const normalizedInputTitle = normalizeWikiTitle(rawTitle);
  if (!normalizedInputTitle) {
    throw new ApiError(400, "INVALID_TITLE", "Article title is required");
  }

  const cacheKey = REDIS_KEYS.article(`${STARWARS_CACHE_PREFIX}:${normalizedInputTitle.toLowerCase()}`);
  const cachedArticle = await cache.get<WikiArticle>(cacheKey);
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

  const payload = await fetchStarWarsJson<StarWarsQueryResponse>(query);
  const page = payload.query?.pages ? Object.values(payload.query.pages)[0] : undefined;
  if (!page || page.missing || !page.title) {
    throw new ApiError(404, "ARTICLE_NOT_FOUND", "Article not found");
  }

  const htmlPayload = await fetchArticleHtmlByTitle(normalizedInputTitle);
  const normalizedTitle = normalizeWikiTitle(page.title);
  const fallbackLinks = dedupeLinks(page.links);
  const links = htmlPayload.links.length > 0 ? htmlPayload.links : fallbackLinks;
  const article: WikiArticle = {
    title: page.title,
    normalizedTitle,
    displayTitle: htmlPayload.displayTitle,
    html: htmlPayload.html,
    extract: page.extract?.trim() || "No summary available.",
    links,
    pageId: page.pageid,
    url: page.fullurl ?? `${getWikiMode("star-wars").baseUrl}/wiki/${normalizedTitle}`,
  };
  const canonicalCacheKey = REDIS_KEYS.article(`${STARWARS_CACHE_PREFIX}:${normalizedTitle.toLowerCase()}`);
  await Promise.all([
    cache.set(cacheKey, article, ARTICLE_CACHE_TTL_SECONDS),
    cache.set(canonicalCacheKey, article, ARTICLE_CACHE_TTL_SECONDS),
    cache.set(REDIS_KEYS.links(`${STARWARS_CACHE_PREFIX}:${normalizedTitle.toLowerCase()}`), links, LINKS_CACHE_TTL_SECONDS),
  ]);

  return article;
}

export async function getOutgoingLinks(normalizedTitleOrRaw: string): Promise<WikiArticleLink[]> {
  const normalizedTitle = normalizeWikiTitle(normalizedTitleOrRaw);
  const linksCacheKey = REDIS_KEYS.links(`${STARWARS_CACHE_PREFIX}:${normalizedTitle.toLowerCase()}`);
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

    const payload = await fetchStarWarsJson<StarWarsQueryResponse>(query);
    const randomPages = payload.query?.random ?? [];
    for (const page of randomPages) {
      if (!page.title || !isLikelyStarWarsArticleTitle(page.title)) {
        continue;
      }

      const normalized = normalizeWikiTitle(page.title);
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
