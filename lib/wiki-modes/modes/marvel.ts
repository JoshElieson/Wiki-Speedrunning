import { getVarietyCategoryMeta } from "@/lib/profile-elo-categories";
import { BASE_DISALLOWED_PREFIXES, createBaseMediaWikiMode } from "../helpers";
import type { WikiModeConfig } from "../types";

const meta = getVarietyCategoryMeta("marvel");

export const marvelWikiMode: WikiModeConfig = createBaseMediaWikiMode({
  id: "marvel",
  displayName: "Marvel Wiki",
  shortName: meta.label,
  description: "Race through heroes, teams, villains, and story arcs.",
  raceLabel: "Marvel Run",
  articleSubtitle: "From the Marvel Database",
  baseUrl: "https://marvel.fandom.com",
  apiEndpoint: "https://marvel.fandom.com/api.php",
  enabled: true,
  eloScope: "marvel",
  accent: meta.accent,
  icon: meta.logo,
  tags: ["Variety"],
  ctaLabel: "Start Marvel Run",
  reader: {
    articleSubtitle: "From the Marvel Database",
    iframeTitlePrefix: "Marvel Wiki article",
    styleSheetHrefs: [
      "https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&display=swap",
      "https://marvel.fandom.com/load.php?lang=en&modules=site.styles&only=styles&skin=fandomdesktop",
      "https://marvel.fandom.com/load.php?lang=en&modules=mediawiki.skinning.content.parsoid%7Cmediawiki.skinning.interface&only=styles&skin=fandomdesktop",
      "https://marvel.fandom.com/load.php?lang=en&modules=skins.fandomdesktop.styles%7Cext.fandom.PortableInfoboxFandomDesktopCSS%7Cext.gadget.site-styles&only=styles&skin=fandomdesktop",
    ],
  },
  articlePathPrefixes: ["/wiki/"],
  internalHostPattern: /(^|\.)marvel\.fandom\.com$/i,
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
  defaultStartTitle: "Spider-Man",
  defaultTargetTitle: "Avengers",
  fallbackChallengeLabel: "Custom Marvel race",
  randomChallengeLabel: "Random Marvel Sprint",
  emergencyChallengeId: "generated-emergency-spider-man-avengers",
  runLabel: "Marvel Run",
  rateLimitErrorMessage: "Marvel Wiki is rate-limiting requests right now. Please wait and try again.",
});
