import { resolveWikiModeId } from "./helpers";
import { leagueWikiMode } from "./modes/league";
import { marvelWikiMode } from "./modes/marvel";
import { minecraftWikiMode } from "./modes/minecraft";
import { pokemonWikiMode } from "./modes/pokemon";
import { starWarsWikiMode } from "./modes/star-wars";
import { wikipediaWikiMode } from "./modes/wikipedia";
import type { WikiModeConfig, WikiModeId } from "./types";

const wikiModesById = new Map<WikiModeId, WikiModeConfig>([
  [wikipediaWikiMode.id, wikipediaWikiMode],
  [minecraftWikiMode.id, minecraftWikiMode],
  [leagueWikiMode.id, leagueWikiMode],
  [pokemonWikiMode.id, pokemonWikiMode],
  [starWarsWikiMode.id, starWarsWikiMode],
  [marvelWikiMode.id, marvelWikiMode],
]);

export const ALL_WIKI_MODES: WikiModeConfig[] = Array.from(wikiModesById.values());

export function getWikiMode(modeId: WikiModeId): WikiModeConfig {
  const mode = wikiModesById.get(modeId);
  if (!mode) {
    throw new Error(`Unknown wiki mode: ${modeId}`);
  }
  return mode;
}

export function getWikiModeOrNull(modeId: string): WikiModeConfig | null {
  return wikiModesById.get(modeId as WikiModeId) ?? null;
}

export function getEnabledWikiModes(): WikiModeConfig[] {
  return ALL_WIKI_MODES.filter((mode) => mode.enabled);
}

export function assertWikiModeEnabled(modeId: WikiModeId): WikiModeConfig {
  const mode = getWikiMode(modeId);
  if (!mode.enabled) {
    throw new Error(`Wiki mode "${modeId}" is not enabled yet`);
  }
  return mode;
}

/** Back-compat alias used across the app and API layers. */
export const getWikiModeConfig = (modeId?: string | null): WikiModeConfig => getWikiMode(resolveWikiModeId(modeId));

/** Back-compat alias. */
export const getWikiModeFromNullable = resolveWikiModeId;

/** Back-compat alias. */
export const getWikiModeId = resolveWikiModeId;

/** Back-compat alias. */
export const getSafeWikiModeId = resolveWikiModeId;

export function isLikelyModeArticleTitle(modeId: WikiModeId, rawTitle: string): boolean {
  return getWikiMode(modeId).isAllowedPageTitle(rawTitle);
}
