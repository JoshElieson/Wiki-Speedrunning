import { getVarietyCategoryMeta } from "@/lib/profile-elo-categories";

import { BASE_DISALLOWED_PREFIXES, createBaseMediaWikiMode } from "../helpers";

import type { WikiModeConfig } from "../types";



const meta = getVarietyCategoryMeta("league");

const LEAGUE_WIKI_ORIGIN = "https://wiki.leagueoflegends.com";

const LEAGUE_READER_STYLES = [

  `${LEAGUE_WIKI_ORIGIN}/en-us/load.php?lang=en&modules=site.styles&only=styles&skin=vector-2022`,

  `${LEAGUE_WIKI_ORIGIN}/en-us/load.php?lang=en&modules=mediawiki.skinning.content.parsoid%7Cmediawiki.skinning.interface&only=styles&skin=vector-2022`,

];



export const leagueWikiMode: WikiModeConfig = createBaseMediaWikiMode({

  id: "league",

  displayName: "League of Legends Wiki",

  shortName: "League",

  description: "Navigate champions, items, abilities, and lore.",

  raceLabel: "League of Legends Run",

  articleSubtitle: "From the League of Legends Wiki",

  baseUrl: LEAGUE_WIKI_ORIGIN,

  apiEndpoint: `${LEAGUE_WIKI_ORIGIN}/en-us/api.php`,

  enabled: true,

  eloScope: "league",

  accent: meta.accent,

  icon: meta.logo,

  tags: ["Variety"],

  ctaLabel: "Start League Run",

  reader: {

    styleSheetHrefs: LEAGUE_READER_STYLES,

    articleSubtitle: "From the League of Legends Wiki",

    iframeTitlePrefix: "League of Legends Wiki article",

  },

  articlePathPrefixes: ["/en-us/"],

  internalHostPattern: /(^|\.)wiki\.leagueoflegends\.com$/i,

  blockedTitlePrefixes: [

    ...BASE_DISALLOWED_PREFIXES,

    "Universe:",

    "Template talk:",

    "User talk:",

  ],

  blockedPathPrefixes: [

    "/en-us/Special:",

    "/en-us/File:",

    "/en-us/Category:",

    "/en-us/User:",

    "/en-us/Template:",

  ],

  articleApiPath: "/api/wiki/article",

  randomChallengeApiPath: "/api/challenges/random",

  defaultStartTitle: "Garen",

  defaultTargetTitle: "Nexus",

  fallbackChallengeLabel: "Custom League race",

  randomChallengeLabel: "Random League Sprint",

  emergencyChallengeId: "generated-emergency-garen-nexus",

  runLabel: "League of Legends Run",

  rateLimitErrorMessage: "League of Legends Wiki is rate-limiting requests right now. Please wait and try again.",

});


