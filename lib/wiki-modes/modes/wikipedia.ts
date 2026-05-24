import { BASE_DISALLOWED_PREFIXES, createBaseMediaWikiMode } from "../helpers";
import type { WikiModeConfig } from "../types";

export const wikipediaWikiMode: WikiModeConfig = createBaseMediaWikiMode({
  id: "wikipedia",
  displayName: "Wikipedia",
  shortName: "Wiki",
  description: "Classic wiki speedrunning across the full encyclopedia.",
  raceLabel: "Wikipedia Run",
  articleSubtitle: "From Wikipedia, the free encyclopedia",
  baseUrl: "https://en.wikipedia.org",
  apiEndpoint: "https://en.wikipedia.org/w/api.php",
  enabled: true,
  eloScope: "wikipedia",
  accent: {
    topBorder: "bg-[var(--accent)]/50",
    badgeBg: "bg-[var(--accent)]/[0.08]",
    dot: "bg-[var(--accent)]/70",
    heroText: "text-[var(--accent)]",
  },
  tags: ["Ranked", "Classic"],
  ctaLabel: "Start Wikipedia Run",
  reader: {
    articleSubtitle: "From Wikipedia, the free encyclopedia",
    iframeTitlePrefix: "Wikipedia article",
  },
  articlePathPrefixes: ["/wiki/"],
  internalHostPattern: /^([a-z-]+\.)?wikipedia\.org$/i,
  blockedTitlePrefixes: [...BASE_DISALLOWED_PREFIXES, "Wikipedia:"],
  articleApiPath: "/api/wiki/article",
  randomChallengeApiPath: "/api/challenges/random",
  defaultStartTitle: "Internet",
  defaultTargetTitle: "Graph theory",
  fallbackChallengeLabel: "Custom Wikipedia race",
  randomChallengeLabel: "Random Wikipedia Sprint",
  emergencyChallengeId: "generated-emergency-internet-graph-theory",
  runLabel: "Wikipedia Run",
  rateLimitErrorMessage: "Wikipedia is rate-limiting requests right now. Please wait a moment and try again.",
});
