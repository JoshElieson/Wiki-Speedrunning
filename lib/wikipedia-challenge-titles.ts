const SMALL_WORDS = new Set([
  "a",
  "an",
  "the",
  "of",
  "in",
  "on",
  "at",
  "for",
  "and",
  "or",
  "but",
  "by",
  "to",
  "from",
  "with",
  "as",
  "vs",
  "via",
  "per",
  "de",
  "la",
  "le",
  "du",
  "des",
  "et",
  "al",
  "nor",
]);

const ROMAN_NUMERAL = /^(?:(?:XL|L?X{0,3})(?:IX|IV|V?I{0,3}))$/i;

function stripDisambiguation(title: string): string {
  const stripped = title.replace(/\s+\([^)]*\)\s*$/, "").trim();
  return stripped || title.trim();
}

function countInternalCapitalizedWords(title: string): number {
  const words = stripDisambiguation(title)
    .split(/\s+/)
    .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter(Boolean);

  let count = 0;
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    if (!word) {
      continue;
    }

    if (/[a-z][\p{Lu}]/u.test(word) || /[\p{Lu}]{2,}[\p{Ll}]/u.test(word)) {
      return Number.POSITIVE_INFINITY;
    }

    if (index === 0) {
      continue;
    }

    const lower = word.toLowerCase();
    if (SMALL_WORDS.has(lower)) {
      continue;
    }

    if (ROMAN_NUMERAL.test(word)) {
      continue;
    }

    if (/^[\p{Lu}]{2,}$/u.test(word)) {
      count += 1;
      continue;
    }

    if (/^[\p{Lu}]/u.test(word) && lower !== word) {
      count += 1;
    }
  }

  return count;
}

/** True when the title looks like a named entity (person, place, brand, etc.) rather than a general topic. */
export function isLikelyProperNounTitle(rawTitle: string): boolean {
  const title = rawTitle.trim();
  if (!title) {
    return true;
  }

  if (/^\d{1,4}(?:\s*(?:BCE|BC|CE|AD))?$/i.test(title)) {
    return true;
  }

  if (/^\d+(?:st|nd|rd|th)\s+(?:century|millennium)\b/i.test(title)) {
    return true;
  }

  return countInternalCapitalizedWords(title) > 0;
}

/**
 * Wikipedia start/finish targets should be general-topic articles: multi-word sentence-case titles
 * without embedded proper names (e.g. "Machine learning", not "Alan Turing" or "United States").
 */
export function isEligibleWikipediaChallengeTitle(rawTitle: string): boolean {
  const title = stripDisambiguation(rawTitle.trim());
  if (!title) {
    return false;
  }

  const wordCount = title.split(/\s+/).filter(Boolean).length;
  if (wordCount < 2) {
    return false;
  }

  return !isLikelyProperNounTitle(title);
}
