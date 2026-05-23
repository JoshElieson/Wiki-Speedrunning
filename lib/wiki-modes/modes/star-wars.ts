import { getVarietyCategoryMeta } from "@/lib/profile-elo-categories";
import { BASE_DISALLOWED_PREFIXES, createBaseMediaWikiMode } from "../helpers";
import type { WikiModeConfig } from "../types";

const meta = getVarietyCategoryMeta("star-wars");
const STAR_WARS_READER_STYLES = [
  "https://starwars.fandom.com/load.php?lang=en&modules=site.styles&only=styles&skin=fandomdesktop",
  "https://starwars.fandom.com/load.php?lang=en&modules=mediawiki.skinning.content.parsoid%7Cmediawiki.skinning.interface&only=styles&skin=fandomdesktop",
  "https://starwars.fandom.com/load.php?lang=en&modules=skins.fandomdesktop.styles%7Cext.fandom.PortableInfoboxFandomDesktopCSS%7Cext.gadget.site-styles&only=styles&skin=fandomdesktop",
];

export const starWarsWikiMode: WikiModeConfig = createBaseMediaWikiMode({
  id: "star-wars",
  displayName: "Star Wars Wiki",
  shortName: meta.label,
  description: "Explore characters, planets, ships, and timelines.",
  raceLabel: "Star Wars Run",
  articleSubtitle: "From Wookieepedia",
  baseUrl: "https://starwars.fandom.com",
  apiEndpoint: "https://starwars.fandom.com/api.php",
  enabled: true,
  eloScope: "star-wars",
  accent: meta.accent,
  icon: meta.logo,
  tags: ["Variety"],
  ctaLabel: "Start Star Wars Run",
  reader: {
    styleSheetHrefs: STAR_WARS_READER_STYLES,
    articleSubtitle: "From Wookieepedia",
    iframeTitlePrefix: "Star Wars Wiki article",
  },
  articlePathPrefixes: ["/wiki/"],
  internalHostPattern: /(^|\.)starwars\.fandom\.com$/i,
  blockedTitlePrefixes: [
    ...BASE_DISALLOWED_PREFIXES,
    "Forum:",
    "Message Wall:",
    "Thread:",
    "Blog:",
    "User blog:",
    "User blog comment:",
  ],
  articleApiPath: "/api/wiki/article",
  randomChallengeApiPath: "/api/challenges/random",
  defaultStartTitle: "Luke Skywalker",
  defaultTargetTitle: "Death Star",
  fallbackChallengeLabel: "Custom Star Wars race",
  randomChallengeLabel: "Random Star Wars Sprint",
  emergencyChallengeId: "generated-emergency-luke-death-star",
  runLabel: "Star Wars Run",
  rateLimitErrorMessage: "Star Wars Wiki is rate-limiting requests right now. Please wait and try again.",
});
