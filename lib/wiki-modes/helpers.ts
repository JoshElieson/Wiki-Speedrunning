import { WIKI_MODE_IDS, type WikiModeConfig, type WikiModeId } from "./types";

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function isWikiModeId(value: string): value is WikiModeId {
  return (WIKI_MODE_IDS as readonly string[]).includes(value);
}

/** @internal Maps legacy API ids to canonical mode ids. */
export const WIKI_MODE_ID_ALIASES = {
  starwars: "star-wars",
} as const satisfies Record<string, WikiModeId>;

export type WikiModeIdAlias = keyof typeof WIKI_MODE_ID_ALIASES;

export function resolveWikiModeId(raw?: string | null): WikiModeId {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return "wikipedia";
  }

  if (trimmed in WIKI_MODE_ID_ALIASES) {
    return WIKI_MODE_ID_ALIASES[trimmed as WikiModeIdAlias];
  }

  return isWikiModeId(trimmed) ? trimmed : "wikipedia";
}

export function createNormalizePageTitle(): WikiModeConfig["normalizePageTitle"] {
  return (rawTitle: string) =>
    safeDecodeURIComponent(rawTitle)
      .trim()
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .replace(/#.*$/g, "")
      .trim()
      .replace(/\s/g, "_");
}

export function createToPageTitleKey(
  normalizePageTitle: WikiModeConfig["normalizePageTitle"],
): WikiModeConfig["toPageTitleKey"] {
  return (rawTitle: string) => normalizePageTitle(rawTitle).toLowerCase();
}

export function createStripDisambiguation(): (title: string) => string {
  return (title: string) => {
    const stripped = title.replace(/\s+\([^)]+\)\s*$/, "").trim();
    return stripped || title;
  };
}

export function createMatchesRaceTarget(
  normalizePageTitle: WikiModeConfig["normalizePageTitle"],
  toPageTitleKey: WikiModeConfig["toPageTitleKey"],
  stripDisambiguation: (title: string) => string,
): WikiModeConfig["matchesRaceTarget"] {
  return (visitedTitle, targetTitle, canonicalTitle) => {
    const targetKey = toPageTitleKey(targetTitle);
    const candidates = [visitedTitle, canonicalTitle].filter((value): value is string => Boolean(value?.trim()));

    return candidates.some((title) => {
      if (toPageTitleKey(title) === targetKey) {
        return true;
      }

      return (
        toPageTitleKey(stripDisambiguation(title)) === toPageTitleKey(stripDisambiguation(targetTitle))
      );
    });
  };
}

export function createIsAllowedPageTitle(
  normalizePageTitle: WikiModeConfig["normalizePageTitle"],
  blockedTitlePrefixes: readonly string[],
): WikiModeConfig["isAllowedPageTitle"] {
  return (rawTitle: string) => {
    const title = normalizePageTitle(rawTitle);
    if (!title) {
      return false;
    }
    if (/\bdisambiguation\b/i.test(title)) {
      return false;
    }

    const upper = title.toUpperCase();
    return !blockedTitlePrefixes.some((prefix) => upper.startsWith(prefix.toUpperCase()));
  };
}

export function createHrefParsers(
  config: Pick<WikiModeConfig, "articlePathPrefixes" | "internalHostPattern" | "isAllowedPageTitle">,
) {
  const extractTitleFromHref: WikiModeConfig["extractTitleFromHref"] = (href) => {
    if (!href || href.startsWith("#")) {
      return null;
    }

    const trimmedHref = href.trim();
    const matchingPrefix = config.articlePathPrefixes.find((prefix) => trimmedHref.startsWith(prefix));
    if (matchingPrefix) {
      return decodePathSegment(config, trimmedHref.slice(matchingPrefix.length));
    }

    if (/^https?:\/\//i.test(trimmedHref)) {
      try {
        const parsed = new URL(trimmedHref);
        if (!config.internalHostPattern.test(parsed.hostname)) {
          return null;
        }
        const pathPrefix = config.articlePathPrefixes.find((prefix) => parsed.pathname.startsWith(prefix));
        if (!pathPrefix) {
          return null;
        }
        return decodePathSegment(config, parsed.pathname.slice(pathPrefix.length));
      } catch {
        return null;
      }
    }

    return null;
  };

  const isInternalLinkHref: WikiModeConfig["isInternalLinkHref"] = (href) => {
    if (!href || href.startsWith("#")) {
      return false;
    }

    const trimmedHref = href.trim();
    if (config.articlePathPrefixes.some((prefix) => trimmedHref.startsWith(prefix))) {
      return true;
    }

    if (!/^https?:\/\//i.test(trimmedHref)) {
      return false;
    }

    try {
      const parsed = new URL(trimmedHref);
      return (
        config.internalHostPattern.test(parsed.hostname) &&
        config.articlePathPrefixes.some((prefix) => parsed.pathname.startsWith(prefix))
      );
    } catch {
      return false;
    }
  };

  return { extractTitleFromHref, isInternalLinkHref };
}

function decodePathSegment(
  config: Pick<WikiModeConfig, "isAllowedPageTitle">,
  raw: string,
): string | null {
  const withoutQuery = raw.split("?")[0]?.split("#")[0] ?? "";
  if (!withoutQuery) {
    return null;
  }

  const decoded = decodeURIComponent(withoutQuery).replace(/_/g, " ").trim();
  if (!decoded || !config.isAllowedPageTitle(decoded)) {
    return null;
  }

  return decoded;
}

const BASE_DISALLOWED_PREFIXES = [
  "File:",
  "Help:",
  "Template:",
  "Category:",
  "Portal:",
  "Special:",
  "Talk:",
  "User:",
  "Module:",
  "Draft:",
  "MediaWiki:",
  "Book:",
] as const;

export { BASE_DISALLOWED_PREFIXES };

export function createBaseMediaWikiMode(
  partial: Omit<
    WikiModeConfig,
    | "leaderboardScope"
    | "normalizePageTitle"
    | "toPageTitleKey"
    | "extractTitleFromHref"
    | "isAllowedPageTitle"
    | "matchesRaceTarget"
    | "isInternalLinkHref"
    | "buildArticleUrl"
    | "formatTitleForRaceUrl"
    | "parseTitleFromRaceUrl"
  > &
    Pick<WikiModeConfig, "blockedTitlePrefixes" | "eloScope">,
): WikiModeConfig {
  const normalizePageTitle = createNormalizePageTitle();
  const toPageTitleKey = createToPageTitleKey(normalizePageTitle);
  const stripDisambiguation = createStripDisambiguation();
  const isAllowedPageTitle = createIsAllowedPageTitle(normalizePageTitle, partial.blockedTitlePrefixes);
  const draft: WikiModeConfig = {
    ...partial,
    leaderboardScope: partial.eloScope,
    normalizePageTitle,
    toPageTitleKey,
    isAllowedPageTitle,
    matchesRaceTarget: createMatchesRaceTarget(normalizePageTitle, toPageTitleKey, stripDisambiguation),
    buildArticleUrl: (normalizedTitle) => `${partial.baseUrl}${partial.articlePathPrefixes[0]}${normalizedTitle}`,
    formatTitleForRaceUrl: (title) => normalizePageTitle(title).replace(/_/g, " "),
    parseTitleFromRaceUrl: (raw) => stripDisambiguation(normalizePageTitle(raw).replace(/_/g, " ")),
    extractTitleFromHref: () => null,
    isInternalLinkHref: () => false,
  };
  const hrefParsers = createHrefParsers(draft);
  return { ...draft, ...hrefParsers };
}
