import { getVarietyCategoryMeta } from "@/lib/profile-elo-categories";
import { BASE_DISALLOWED_PREFIXES, createBaseMediaWikiMode } from "../helpers";
import type { WikiModeConfig } from "../types";

const meta = getVarietyCategoryMeta("pokemon");
const POKEMON_READER_STYLES =
  "https://bulbapedia.bulbagarden.net/w/load.php?lang=en&modules=site.styles%7Cmediawiki.skinning.content.parsoid%7Cmediawiki.skinning.interface%7Cskins.vector.styles%7Cext.cite.styles%7Cmediawiki.page.gallery.styles&only=styles&skin=vector";

export const pokemonWikiMode: WikiModeConfig = createBaseMediaWikiMode({
  id: "pokemon",
  displayName: "Pokémon",
  asciiName: "Pokemon Wiki",
  shortName: meta.label,
  description: "Speedrun through Pokémon, moves, regions, and types.",
  raceLabel: "Pokémon Run",
  articleSubtitle: "From Bulbapedia, the community-driven Pokémon encyclopedia",
  baseUrl: "https://bulbapedia.bulbagarden.net",
  apiEndpoint: "https://bulbapedia.bulbagarden.net/w/api.php",
  enabled: true,
  eloScope: "pokemon",
  accent: meta.accent,
  icon: meta.logo,
  tags: ["Variety"],
  ctaLabel: "Start Pokémon Run",
  reader: {
    styleSheetHref: POKEMON_READER_STYLES,
    articleSubtitle: "From Bulbapedia, the community-driven Pokémon encyclopedia",
    iframeTitlePrefix: "Pokémon Wiki article",
  },
  articlePathPrefixes: ["/wiki/"],
  internalHostPattern: /(^|\.)bulbapedia\.bulbagarden\.net$/i,
  blockedTitlePrefixes: [
    ...BASE_DISALLOWED_PREFIXES,
    "Template talk:",
    "User talk:",
    "Forum:",
    "Message Wall:",
    "Blog:",
    "Thread:",
    "Board:",
    "Bulbapedia:",
    "Bulbapedia talk:",
    "Project:",
    "Project talk:",
    "Archive:",
  ],
  blockedPathPrefixes: ["/wiki/Special:", "/wiki/File:", "/wiki/Category:", "/wiki/Forum:", "/wiki/Bulbapedia:"],
  articleApiPath: "/api/wiki/article",
  randomChallengeApiPath: "/api/challenges/random",
  defaultStartTitle: "Bulbasaur",
  defaultTargetTitle: "Mega Evolution",
  fallbackChallengeLabel: "Custom Pokémon race",
  randomChallengeLabel: "Random Pokémon Sprint",
  emergencyChallengeId: "generated-emergency-bulbasaur-mega-evolution",
  runLabel: "Pokémon Run",
  rateLimitErrorMessage: "Pokémon Wiki is rate-limiting requests right now. Please wait and try again.",
});
