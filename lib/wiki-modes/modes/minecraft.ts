import { getVarietyCategoryMeta } from "@/lib/profile-elo-categories";
import { BASE_DISALLOWED_PREFIXES, createBaseMediaWikiMode } from "../helpers";
import type { WikiModeConfig } from "../types";

const meta = getVarietyCategoryMeta("minecraft");

export const minecraftWikiMode: WikiModeConfig = createBaseMediaWikiMode({
  id: "minecraft",
  displayName: "Minecraft Wiki",
  shortName: meta.label,
  description: "Race through blocks, mobs, items, and mechanics.",
  raceLabel: "Minecraft Wiki Run",
  articleSubtitle: "From Minecraft Wiki",
  baseUrl: "https://minecraft.wiki",
  apiEndpoint: "https://minecraft.wiki/api.php",
  enabled: true,
  eloScope: "minecraft",
  accent: meta.accent,
  icon: meta.logo,
  tags: ["Variety"],
  ctaLabel: "Start Minecraft Run",
  reader: {
    articleSubtitle: "From Minecraft Wiki",
    iframeTitlePrefix: "Minecraft Wiki article",
  },
  articlePathPrefixes: ["/w/", "/wiki/"],
  internalHostPattern: /(^|\.)minecraft\.wiki$/i,
  blockedTitlePrefixes: BASE_DISALLOWED_PREFIXES,
  articleApiPath: "/api/wiki/article",
  randomChallengeApiPath: "/api/challenges/random",
  defaultStartTitle: "Stone",
  defaultTargetTitle: "Ender Dragon",
  fallbackChallengeLabel: "Custom Minecraft race",
  randomChallengeLabel: "Random Minecraft Sprint",
  emergencyChallengeId: "generated-emergency-stone-ender-dragon",
  runLabel: "Minecraft Wiki Run",
  rateLimitErrorMessage: "Minecraft Wiki is rate-limiting requests right now. Please wait and try again.",
});
