const DISALLOWED_PREFIXES = ["File:", "Help:", "Template:", "Category:", "Portal:", "Special:", "Talk:", "User:"];

export function normalizeWikiTitle(rawTitle: string): string {
  return decodeURIComponent(rawTitle)
    .trim()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .replace(/#/g, "")
    .replace(/^\s+|\s+$/g, "")
    .replace(/\s/g, "_");
}

export function isLikelyArticleTitle(title: string): boolean {
  if (!title || title.length < 1) {
    return false;
  }

  return !DISALLOWED_PREFIXES.some((prefix) => title.startsWith(prefix));
}
