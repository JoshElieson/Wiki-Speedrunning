const DISALLOWED_PREFIXES = [
  "File:",
  "Help:",
  "Template:",
  "Category:",
  "Portal:",
  "Special:",
  "Talk:",
  "User:",
  "Wikipedia:",
  "Module:",
  "Draft:",
  "MediaWiki:",
  "Book:",
];

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function normalizeWikiTitle(rawTitle: string): string {
  return safeDecodeURIComponent(rawTitle)
    .trim()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .replace(/#.*$/g, "")
    .trim()
    .replace(/\s/g, "_");
}

export function toWikiTitleKey(rawTitle: string): string {
  return normalizeWikiTitle(rawTitle).toLowerCase();
}

/** Wikipedia disambiguation suffix, e.g. "Nexus (League of Legends)" → "Nexus". */
export function stripWikiDisambiguation(title: string): string {
  const stripped = title.replace(/\s+\([^)]+\)\s*$/, "").trim();
  return stripped || title;
}

export function isLikelyArticleTitle(rawTitle: string): boolean {
  const title = normalizeWikiTitle(rawTitle);
  if (!title) {
    return false;
  }

  const upper = title.toUpperCase();
  return !DISALLOWED_PREFIXES.some((prefix) => upper.startsWith(prefix.toUpperCase()));
}
