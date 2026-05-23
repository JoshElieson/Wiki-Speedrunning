import sanitizeHtml from "sanitize-html";
import { REDIS_KEYS } from "@/db/constants";
import { cache } from "@/server/cache/cache";
import { ApiError } from "@/server/errors/api-error";
import { getWikiMode, isLikelyModeArticleTitle, type WikiModeId } from "@/lib/wiki-modes";
import { createStripDisambiguation } from "@/lib/wiki-modes/helpers";
import { normalizeWikiTitle, toWikiTitleKey } from "./title-normalization";
import type { WikiArticle, WikiArticleLink } from "@/types/domain";

const ARTICLE_CACHE_TTL_SECONDS = 10 * 60;
const LINKS_CACHE_TTL_SECONDS = 10 * 60;
const WIKI_RENDER_CACHE_VERSION = "v11";
const WIKI_STYLE_CACHE_TTL_SECONDS = 6 * 60 * 60;
const stripDisambiguationSuffix = createStripDisambiguation();

type MediaWikiPage = {
  pageid?: number;
  title?: string;
  extract?: string;
  fullurl?: string;
  links?: Array<{ title?: string }>;
  missing?: boolean;
};

type MediaWikiParseResponse = {
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

type MediaWikiQueryResponse = {
  query?: {
    pages?: Record<string, MediaWikiPage>;
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

const POKEMON_EXTRA_ALLOWED_TAGS = ["font", "big", "hr"] as const;

function getSanitizeOptions(modeId: WikiModeId): sanitizeHtml.IOptions {
  const baseUrl = getWikiMode(modeId).baseUrl;
  const extraAllowedTags = modeId === "pokemon" ? [...POKEMON_EXTRA_ALLOWED_TAGS] : [];
  const stripSelectors = [
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
    "license-description",
    "bulbapedia-nav",
    "site-notice",
  ];
  const absolutize = (value: string | undefined): string | undefined => {
    if (!value) {
      return value;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return value;
    }
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
      return trimmed;
    }
    if (trimmed.startsWith("//")) {
      return `https:${trimmed}`;
    }
    if (trimmed.startsWith("#")) {
      return trimmed;
    }
    try {
      return new URL(trimmed, `${baseUrl}/`).toString();
    } catch {
      return trimmed;
    }
  };
  const absolutizeSrcset = (value: string | undefined): string | undefined => {
    if (!value) {
      return value;
    }
    return value
      .split(",")
      .map((entry) => {
        const trimmed = entry.trim();
        if (!trimmed) {
          return "";
        }
        const firstSpace = trimmed.indexOf(" ");
        if (firstSpace === -1) {
          return absolutize(trimmed) ?? trimmed;
        }
        const rawUrl = trimmed.slice(0, firstSpace);
        const descriptor = trimmed.slice(firstSpace + 1).trim();
        const resolved = absolutize(rawUrl) ?? rawUrl;
        return descriptor ? `${resolved} ${descriptor}` : resolved;
      })
      .filter(Boolean)
      .join(", ");
  };
  const absolutizeStyleUrls = (value: string | undefined): string | undefined => {
    if (!value) {
      return value;
    }
    return value.replace(/url\((['"]?)([^'")]+)\1\)/gi, (_full, quote: string, rawUrl: string) => {
      const resolved = absolutize(rawUrl) ?? rawUrl;
      return `url(${quote}${resolved}${quote})`;
    });
  };

  return {
  allowedTags: [
    ...extraAllowedTags,
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
    "img",
    "section",
    "article",
    "aside",
    "header",
    "footer",
    "nav",
    "input",
    "label",
    "details",
    "summary",
    "colgroup",
    "col",
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
    "source",
  ],
    allowedAttributes: {
    a: ["href", "title", "rel", "class", "id", "target"],
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
      "data-src",
      "data-srcset",
    ],
    table: ["class", "id", "style", "align", "width", "border", "cellpadding", "cellspacing"],
    tr: ["class", "id", "style", "align", "valign"],
    th: ["scope", "colspan", "rowspan", "class", "id", "style", "align", "valign", "width", "height", "data-expandtext", "data-collapsetext"],
    td: ["colspan", "rowspan", "class", "id", "style", "align", "valign", "width", "height", "data-expandtext", "data-collapsetext"],
    font: ["size", "color", "face", "class", "id", "style"],
    span: ["class", "id", "style", "lang", "dir"],
    div: ["class", "id", "style", "lang", "dir", "role", "data-expandtext", "data-collapsetext", "data-source"],
    aside: ["class", "id", "style", "lang", "dir", "role", "data-source"],
    input: ["type", "role", "id", "class", "style", "checked"],
    label: ["class", "id", "style", "for"],
    h2: ["class", "id", "style", "data-source"],
    h3: ["class", "id", "style", "data-source"],
    section: ["class", "id", "style", "lang", "dir", "role", "data-source"],
    picture: ["class", "id", "style"],
    article: ["class", "id", "style", "lang", "dir", "role"],
    nav: ["class", "id", "style", "lang", "dir", "role", "aria-label"],
    details: ["class", "id", "style", "open"],
    summary: ["class", "id", "style"],
    colgroup: ["class", "id", "style", "span"],
    col: ["class", "id", "style", "span", "width"],
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
      "data-source",
      "typeof",
    ],
    source: ["srcset", "sizes", "type", "media", "data-srcset"],
  },
    disallowedTagsMode: "discard",
    parser: {
      lowerCaseTags: true,
    },
    allowedSchemes: ["http", "https", "data"],
    allowProtocolRelative: true,
    transformTags: {
      "*": (tagName, attribs) => {
        const nextAttribs: Record<string, string> = {};
        for (const [key, value] of Object.entries(attribs)) {
          if (typeof value === "string") {
            nextAttribs[key] = value;
          }
        }
        const style = absolutizeStyleUrls(attribs.style);
        if (style) {
          nextAttribs.style = style;
        } else {
          delete nextAttribs.style;
        }
        return { tagName, attribs: nextAttribs };
      },
      a: (tagName, attribs) => {
        const nextAttribs = { ...attribs };
        const href = absolutize(attribs.href);
        if (href) {
          nextAttribs.href = href;
        } else {
          delete nextAttribs.href;
        }
        return { tagName, attribs: nextAttribs };
      },
      img: (tagName, attribs) => {
        const nextAttribs = { ...attribs };
        const src = absolutize(attribs.src ?? attribs["data-src"]);
        const srcset = absolutizeSrcset(attribs.srcset ?? attribs["data-srcset"]);
        const dataSrc = absolutize(attribs["data-src"]);
        const dataSrcset = absolutizeSrcset(attribs["data-srcset"]);

        if (src) {
          nextAttribs.src = src;
        } else {
          delete nextAttribs.src;
        }
        if (srcset) {
          nextAttribs.srcset = srcset;
        } else {
          delete nextAttribs.srcset;
        }
        if (dataSrc) {
          nextAttribs["data-src"] = dataSrc;
        } else {
          delete nextAttribs["data-src"];
        }
        if (dataSrcset) {
          nextAttribs["data-srcset"] = dataSrcset;
        } else {
          delete nextAttribs["data-srcset"];
        }
        return { tagName, attribs: nextAttribs };
      },
      source: (tagName, attribs) => {
        const nextAttribs = { ...attribs };
        const srcset = absolutizeSrcset(attribs.srcset ?? attribs["data-srcset"]);
        const dataSrcset = absolutizeSrcset(attribs["data-srcset"]);
        if (srcset) {
          nextAttribs.srcset = srcset;
        } else {
          delete nextAttribs.srcset;
        }
        if (dataSrcset) {
          nextAttribs["data-srcset"] = dataSrcset;
        } else {
          delete nextAttribs["data-srcset"];
        }
        return { tagName, attribs: nextAttribs };
      },
    },
    exclusiveFilter: (frame) => {
      const className = frame.attribs.class ?? "";
      const id = frame.attribs.id ?? "";
      const haystack = `${className} ${id}`.toLowerCase();
      return stripSelectors.some((token) => haystack.includes(token));
    },
  };
}

async function fetchMediaWikiJson<T extends MediaWikiQueryResponse | MediaWikiParseResponse>(
  modeId: WikiModeId,
  params: URLSearchParams,
): Promise<T> {
  const config = getWikiMode(modeId);
  const response = await fetch(`${config.apiEndpoint}?${params.toString()}`, {
    headers: { "User-Agent": "Wikipedia Speedrunning Ranked/1.0 (portfolio project)" },
    next: { revalidate: ARTICLE_CACHE_TTL_SECONDS },
  });

  if (!response.ok) {
    throw new ApiError(502, "MEDIAWIKI_HTTP_ERROR", `${config.displayName} API responded with ${response.status}`);
  }

  const payload = (await response.json()) as T;
  if (payload.error) {
    throw new ApiError(502, "MEDIAWIKI_API_ERROR", payload.error.info, payload.error);
  }

  return payload;
}

function rewriteFilepathUrls(modeId: WikiModeId, css: string): string {
  const config = getWikiMode(modeId);
  const filePathPrefix =
    modeId === "minecraft" ? "/w/Special:FilePath/" : modeId === "league" ? "/en-us/Special:FilePath/" : "/Special:FilePath/";
  return css.replace(/filepath:\/\/([^)"'\s]+)/g, (_match, rawPath: string) => {
    const decodedPath = decodeURIComponent(rawPath).replace(/ /g, "_");
    return `${config.baseUrl}${filePathPrefix}${encodeURIComponent(decodedPath)}`;
  });
}

function extractRevisionText(page: unknown): string | null {
  if (!page || typeof page !== "object") {
    return null;
  }
  const pageRecord = page as Record<string, unknown>;
  const revisions = pageRecord.revisions;
  if (!Array.isArray(revisions) || revisions.length === 0) {
    return null;
  }
  const firstRevision = revisions[0];
  if (!firstRevision || typeof firstRevision !== "object") {
    return null;
  }
  const slots = (firstRevision as { slots?: unknown }).slots;
  if (!slots || typeof slots !== "object") {
    return null;
  }
  const mainSlot = (slots as { main?: unknown }).main;
  if (!mainSlot || typeof mainSlot !== "object") {
    return null;
  }
  const content = (mainSlot as Record<string, unknown>)["*"];
  return typeof content === "string" ? content : null;
}

async function fetchWikiSystemCss(modeId: WikiModeId): Promise<string> {
  if (modeId !== "minecraft" && modeId !== "league" && modeId !== "pokemon" && modeId !== "marvel") {
    return "";
  }

  const stylesCacheKey = REDIS_KEYS.article(`${modeId}:styles:v5`);
  const cachedStyles = await cache.get<string>(stylesCacheKey);
  if (cachedStyles) {
    return cachedStyles;
  }

  const query = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    prop: "revisions",
    rvprop: "content",
    rvslots: "main",
    titles:
      modeId === "league"
        ? ["MediaWiki:Common.css", "MediaWiki:Vector.css", "MediaWiki:Vector-theme-dark.css"].join("|")
        : modeId === "marvel"
        ? [
            "MediaWiki:Common.css",
            "MediaWiki:Theme-aurora.css",
            "MediaWiki:FandomDesktop.css",
            "MediaWiki:PortableInfobox.css",
          ].join("|")
        : modeId === "pokemon"
          ? ["MediaWiki:Common.css", "MediaWiki:Vector.css"].join("|")
          : [
              "MediaWiki:Common.css",
              "MediaWiki:Vector.css",
              "MediaWiki:Vector-theme-dark.css",
              "MediaWiki:Gadget-site-styles.css",
            ].join("|"),
  });
  const payload = await fetchMediaWikiJson<MediaWikiQueryResponse>(modeId, query);
  const pages = payload.query?.pages ? Object.values(payload.query.pages as Record<string, unknown>) : [];
  const mergedCss = pages
    .map((page) => extractRevisionText(page))
    .filter((value): value is string => Boolean(value && value.trim()))
    .join("\n\n");
  const rewrittenCss = rewriteFilepathUrls(modeId, mergedCss);
  const minecraftReaderOverrides = `
.history-json,.chest-json,.chestcontents-json,.sound-json,.spawntable-json,.advancements-json,.achievements-json{display:none!important;}
body.skin-vector{background-color:var(--base-background-color,#303030)!important;background-image:var(--header-background)!important;background-repeat:repeat-x!important;background-position:top left!important;background-size:auto 234px!important;}
@media (-webkit-min-device-pixel-ratio:1.5),(min-resolution:1.5dppx){body.skin-vector{background-image:var(--header-background-hidpi,var(--header-background))!important;}}
#toc,.toc{display:table;background-color:#f8f9fa;border:1px solid #a2a9b1;padding:7px;font-size:95%;}
#toc .toctitle,.toc .toctitle{text-align:center;font-weight:700;}
#toc ul,.toc ul{list-style:none;margin:0;padding-left:0;}
#toc .tocnumber,.toc .tocnumber{color:#202122;}
.mw-heading2,.mw-heading3,.mw-heading4{border-bottom:1px solid #a2a9b1;margin-top:1em;margin-bottom:0.25em;}
.client-js .collapsible.collapsed>tr:not(:first-child),.client-js .collapsible.collapsed>tbody>tr:not(:first-child),.client-js .collapsible.collapsed>thead+tbody>tr:first-child,.client-js .collapsible.collapsed>tbody+tbody>tr:first-child,.client-js .collapsible.collapsed>tfoot>tr,.client-js .collapsible.collapsed>.collapsible-content{display:none!important;}
.collapsetoggle{display:inline-block;float:right;margin-left:.8em;font-weight:400;font-style:normal;text-align:right;}
.collapsetoggle .jslink{cursor:pointer;color:#0645ad;}
`;
  const pokemonReaderOverrides = `
.mw-editsection,.reference-edit{display:none!important;}
.mw-parser-output #toc,.mw-parser-output .toc{display:table;float:left;clear:left;background-color:#f8f9fa;border:1px solid #a2a9b1;padding:7px;font-size:88%;line-height:1.45;margin:0 1em 0.75em 0;max-width:min(100%,20em);}
.mw-parser-output #toc .toctitle,.mw-parser-output .toc .toctitle{text-align:center;font-weight:700;}
.mw-parser-output #toc ul,.mw-parser-output .toc ul{list-style:none;margin:0.35em 0 0;padding-left:0;}
.mw-parser-output #toc .tocnumber,.mw-parser-output .toc .tocnumber{color:#202122;}
.mw-parser-output #toc a,.mw-parser-output .toc a{color:#0645ad;}
.mw-parser-output table{display:table!important;border-collapse:separate;border-spacing:0;}
.mw-parser-output table.infobox,.mw-parser-output table.roundy.infobox{float:right!important;clear:right!important;box-sizing:border-box;}
.mw-parser-output table.roundy[align="left"]{float:left!important;clear:left!important;margin:0 0.5em 0.5em 0!important;}
.mw-parser-output table.roundy[align="right"]{float:right!important;clear:right!important;margin:0 0 0.5em 0.5em!important;}
.mw-parser-output center table.roundy,.mw-parser-output table.roundy[align="center"]{margin-left:auto!important;margin-right:auto!important;}
.mw-parser-output .sc{font-variant:small-caps;}
.mw-parser-output h2{border-bottom:1px solid #a2a9b1;margin:1.2em 0 0.35em;padding-bottom:0.2em;font-size:1.4em;font-weight:700;clear:both;}
.mw-parser-output h3{font-size:1.15em;font-weight:700;margin:0.9em 0 0.25em;}
.mw-parser-output a{color:#0645ad;}
.mw-parser-output table.navbox,.mw-parser-output .navbox-wrapper table{display:table!important;width:100%!important;max-width:100%!important;clear:both;margin-top:1em;}
.client-js .collapsible.collapsed>tr:not(:first-child),.client-js .collapsible.collapsed>tbody>tr:not(:first-child),.client-js .collapsible.collapsed>thead+tbody>tr:first-child,.client-js .collapsible.collapsed>tbody+tbody>tr:first-child,.client-js .collapsible.collapsed>tfoot>tr,.client-js .collapsible.collapsed>.collapsible-content{display:none!important;}
.collapsetoggle{display:inline-block;float:right;margin-left:.8em;font-weight:400;font-style:normal;text-align:right;}
.collapsetoggle .jslink{cursor:pointer;color:#0645ad;}
`;
  const marvelReaderOverrides = `
.wds-global-navigation-wrapper,.wikia-ad,.ad-slot,.gpt-ad,.fandom-sticky-header-container,.mw-editsection,.reference-edit,.portable-infobox__edit{display:none!important;}
.portable-infobox{float:right;clear:right;width:270px;max-width:min(340px,100%);margin:0 0 1em 1em;border:1px solid #ccc;background:#fff;font-size:0.875rem;line-height:1.45;box-shadow:0 1px 2px rgba(0,0,0,.08);}
.portable-infobox .pi-secondary-background{background-color:#520008!important;color:#fff!important;}
.portable-infobox .pi-title,.portable-infobox .pi-header{text-align:center;font-weight:700;font-size:1em;padding:0.45em 0.6em;margin:0;}
.portable-infobox .pi-item-spacing{padding:0.35em 0.6em;}
.portable-infobox .pi-data{display:block;}
.portable-infobox .pi-data-label{font-weight:700;font-size:0.92em;display:block;margin-bottom:0.15em;}
.portable-infobox .pi-data-value{display:block;}
.portable-infobox .pi-border-color{border-color:#ccc;}
.portable-infobox .pi-collapse-closed>.pi-data,.portable-infobox .pi-collapse-closed>.pi-smart-group{display:none!important;}
.portable-infobox .pi-collapse .pi-header{cursor:pointer;position:relative;padding-right:1.5em;}
.portable-infobox .pi-collapse-closed .pi-header::after{content:"▾";position:absolute;right:0.6em;}
.portable-infobox .pi-collapse-open .pi-header::after{content:"▴";position:absolute;right:0.6em;}
#toc,.toc{display:table;background-color:#f8f9fa;border:1px solid #a2a9b1;padding:7px;font-size:95%;margin:0 0 1em;max-width:min(100%,24em);}
#toc .toctitle,.toc .toctitle{text-align:center;font-weight:700;}
#toc ul,.toc ul{list-style:none;margin:0.35em 0 0;padding-left:0;}
#toc .tocnumber,.toc .tocnumber{color:#333;padding-right:0.35em;}
#toc a,.toc a{color:#0645ad;text-decoration:none;}
#toc a:hover,.toc a:hover{text-decoration:underline;}
.mw-parser-output h2{border-bottom:1px solid #a2a9b1;margin:1.2em 0 0.35em;padding-bottom:0.2em;font-size:1.4em;font-weight:700;}
.mw-parser-output h3{font-size:1.15em;font-weight:700;margin:0.9em 0 0.25em;}
.mw-parser-output a{color:#0645ad;}
.mw-parser-output table.navbox{display:table!important;width:100%!important;}
`;
  const leagueReaderOverrides = `
.mw-editsection,.reference-edit,#game-nav,.onlymobile{display:none!important;}
.mw-collapsible.mw-collapsed>.mw-collapsible-content,.mw-collapsible.mw-collapsed>.va-collapsible-content{display:none!important;}
td.mw-collapsible.mw-collapsed>.mw-collapsible-content,th.mw-collapsible.mw-collapsed>.mw-collapsible-content{display:none!important;}
.mw-collapsible-toggle{color:#0099ff;text-decoration:none;font-weight:400;font-size:0.85em;}
.mw-collapsible-header{position:relative;}
.mw-collapsible-toggle{position:absolute;right:0;top:50%;transform:translateY(-50%);}
.mw-parser-output table.navbox,.mw-parser-output .navbox-wrapper table{display:table!important;width:100%!important;max-width:100%!important;}
.mw-parser-output .navbox-wrapper{margin-top:1rem;}
.mw-parser-output .toc,#toc{display:none!important;}
`;
  const cssWithFixes =
    modeId === "league"
      ? `${rewrittenCss}\n${leagueReaderOverrides}`
      : modeId === "marvel"
        ? `${rewrittenCss}\n${marvelReaderOverrides}`
        : modeId === "pokemon"
          ? `${rewrittenCss}\n${pokemonReaderOverrides}`
          : `${rewrittenCss}\n${minecraftReaderOverrides}`;

  await cache.set(stylesCacheKey, cssWithFixes, WIKI_STYLE_CACHE_TTL_SECONDS);
  return cssWithFixes;
}

function dedupeAndFilterLinks(modeId: WikiModeId, links: Array<{ title?: string }> | undefined): WikiArticleLink[] {
  const byNormalized = new Map<string, WikiArticleLink>();
  for (const link of links ?? []) {
    if (!link.title) {
      continue;
    }

    const normalized = normalizeWikiTitle(link.title);
    if (!isLikelyModeArticleTitle(modeId, normalized)) {
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

function dedupeAndFilterParseLinks(
  modeId: WikiModeId,
  links: Array<{ ns?: number; exists?: string; "*": string }> | undefined,
): WikiArticleLink[] {
  const byNormalized = new Map<string, WikiArticleLink>();
  for (const link of links ?? []) {
    if (!link || typeof link["*"] !== "string") {
      continue;
    }

    if (link.ns !== 0 || link.exists === undefined) {
      continue;
    }

    const normalized = normalizeWikiTitle(link["*"]);
    if (!isLikelyModeArticleTitle(modeId, normalized)) {
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

async function fetchArticleHtmlByTitle(modeId: WikiModeId, normalizedInputTitle: string): Promise<{
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
    redirects: "1",
  });

  const payload = await fetchMediaWikiJson<MediaWikiParseResponse>(modeId, parseQuery);
  const htmlSource = payload.parse?.text?.["*"] ?? "";
  const sanitizedHtml = sanitizeHtml(htmlSource, getSanitizeOptions(modeId));
  const wikiSystemCss = await fetchWikiSystemCss(modeId);
  const styledHtml = wikiSystemCss ? `<style>${wikiSystemCss}</style>\n${sanitizedHtml}` : sanitizedHtml;
  const links = dedupeAndFilterParseLinks(modeId, payload.parse?.links);
  const displayTitle = stripHtmlText(payload.parse?.displaytitle) || normalizedInputTitle.replace(/_/g, " ");

  return {
    html: styledHtml,
    displayTitle,
    links,
  };
}

function buildArticleFromPage(
  modeId: WikiModeId,
  page: MediaWikiPage,
  htmlPayload: { html: string; displayTitle: string; links: WikiArticleLink[] },
): WikiArticle {
  if (!page.title) {
    throw new ApiError(404, "ARTICLE_NOT_FOUND", "Article not found");
  }

  const config = getWikiMode(modeId);
  const normalizedTitle = normalizeWikiTitle(page.title);
  const fallbackLinks = dedupeAndFilterLinks(modeId, page.links);
  const links = htmlPayload.links.length > 0 ? htmlPayload.links : fallbackLinks;
  return {
    title: page.title,
    normalizedTitle,
    displayTitle: htmlPayload.displayTitle,
    html: htmlPayload.html,
    extract: page.extract?.trim() || "No summary available.",
    links,
    pageId: page.pageid,
    url: page.fullurl ?? `${config.baseUrl}${config.articlePathPrefixes[0]}${normalizedTitle}`,
  };
}

export async function fetchWikiArticleByTitle(modeId: WikiModeId, rawTitle: string): Promise<WikiArticle> {
  const resolvedTitle =
    modeId !== "wikipedia" ? stripDisambiguationSuffix(rawTitle.trim()) || rawTitle.trim() : rawTitle.trim();
  const normalizedInputTitle = normalizeWikiTitle(resolvedTitle);
  if (!normalizedInputTitle) {
    throw new ApiError(400, "INVALID_TITLE", "Article title is required");
  }

  const cacheTitleKey = `${modeId}:${WIKI_RENDER_CACHE_VERSION}:${normalizedInputTitle.toLowerCase()}`;
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

  const payload = await fetchMediaWikiJson<MediaWikiQueryResponse>(modeId, query);
  const page = payload.query?.pages ? Object.values(payload.query.pages)[0] : undefined;
  if (!page || page.missing) {
    throw new ApiError(404, "ARTICLE_NOT_FOUND", "The page you specified doesn't exist.");
  }

  const htmlPayload = await fetchArticleHtmlByTitle(modeId, normalizedInputTitle);
  const article = buildArticleFromPage(modeId, page, htmlPayload);
  const canonicalCacheKey = REDIS_KEYS.article(`${modeId}:${WIKI_RENDER_CACHE_VERSION}:${article.normalizedTitle.toLowerCase()}`);

  await Promise.all([
    cache.set(articleCacheKey, article, ARTICLE_CACHE_TTL_SECONDS),
    cache.set(canonicalCacheKey, article, ARTICLE_CACHE_TTL_SECONDS),
    cache.set(REDIS_KEYS.links(`${modeId}:${WIKI_RENDER_CACHE_VERSION}:${article.normalizedTitle.toLowerCase()}`), article.links, LINKS_CACHE_TTL_SECONDS),
  ]);

  return article;
}

export async function getWikiOutgoingLinks(modeId: WikiModeId, normalizedTitleOrRaw: string): Promise<WikiArticleLink[]> {
  const normalizedTitle = normalizeWikiTitle(normalizedTitleOrRaw);
  const linksCacheKey = REDIS_KEYS.links(`${modeId}:${WIKI_RENDER_CACHE_VERSION}:${normalizedTitle.toLowerCase()}`);
  const cached = await cache.get<WikiArticleLink[]>(linksCacheKey);
  if (cached) {
    return cached;
  }

  const article = await fetchWikiArticleByTitle(modeId, normalizedTitle);
  return article.links;
}

export async function isValidWikiOutgoingLink(modeId: WikiModeId, currentTitle: string, candidateNextTitle: string): Promise<boolean> {
  const normalizedNextTitleKey = toWikiTitleKey(candidateNextTitle);
  const outgoingLinks = await getWikiOutgoingLinks(modeId, currentTitle);
  return outgoingLinks.some((link) => toWikiTitleKey(link.normalizedTitle) === normalizedNextTitleKey);
}

export async function fetchRandomWikiArticleTitles(modeId: WikiModeId, limit: number): Promise<string[]> {
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

    const payload = await fetchMediaWikiJson<MediaWikiQueryResponse>(modeId, query);
    const randomPages = payload.query?.random ?? [];
    for (const page of randomPages) {
      if (!page.title) {
        continue;
      }
      const normalized = normalizeWikiTitle(page.title);
      if (!isLikelyModeArticleTitle(modeId, normalized)) {
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
