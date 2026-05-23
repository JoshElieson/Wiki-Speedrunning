import { ApiError } from "@/server/errors/api-error";
import {
  fetchRandomWikiArticleTitles,
  fetchWikiArticleByTitle,
  isValidWikiOutgoingLink,
} from "@/server/services/wiki/mediawiki-service";
import * as starWarsService from "@/server/services/wiki/starwars-service";
import * as wikipediaService from "@/server/services/wiki/wikipedia-service";
import { assertWikiModeEnabled, getWikiMode } from "../registry";
import { resolveWikiModeId } from "../helpers";
import type { WikiModeId } from "../types";
import type { WikiModeServerAdapter } from "./types";

type MediaWikiModeId = "minecraft" | "marvel" | "league" | "pokemon";

function createMediaWikiAdapter(modeId: MediaWikiModeId): WikiModeServerAdapter {
  return {
    modeId,
    fetchArticleByTitle: (rawTitle) => fetchWikiArticleByTitle(modeId, rawTitle),
    isValidOutgoingLink: (currentTitle, candidateNextTitle) =>
      isValidWikiOutgoingLink(modeId, currentTitle, candidateNextTitle),
    fetchRandomPageTitles: (limit) => fetchRandomWikiArticleTitles(modeId, limit),
  };
}

const serverAdaptersByMode = new Map<WikiModeId, WikiModeServerAdapter>([
  [
    "wikipedia",
    {
      modeId: "wikipedia",
      fetchArticleByTitle: wikipediaService.fetchArticleByTitle,
      isValidOutgoingLink: wikipediaService.isValidOutgoingLink,
      fetchRandomPageTitles: wikipediaService.fetchRandomArticleTitles,
    },
  ],
  ["minecraft", createMediaWikiAdapter("minecraft")],
  ["marvel", createMediaWikiAdapter("marvel")],
  ["league", createMediaWikiAdapter("league")],
  ["pokemon", createMediaWikiAdapter("pokemon")],
  [
    "star-wars",
    {
      modeId: "star-wars",
      fetchArticleByTitle: starWarsService.fetchArticleByTitle,
      isValidOutgoingLink: starWarsService.isValidOutgoingLink,
      fetchRandomPageTitles: starWarsService.fetchRandomArticleTitles,
    },
  ],
]);

export function getWikiModeServerAdapter(modeId: WikiModeId): WikiModeServerAdapter {
  const adapter = serverAdaptersByMode.get(modeId);
  if (!adapter) {
    throw new ApiError(400, "UNKNOWN_WIKI_MODE", `Unknown wiki mode: ${modeId}`);
  }
  return adapter;
}

export function getEnabledWikiModeServerAdapter(modeId: WikiModeId): WikiModeServerAdapter {
  assertWikiModeEnabled(modeId);
  return getWikiModeServerAdapter(modeId);
}

export function resolveWikiModeFromParam(rawMode: string | null): WikiModeId {
  const modeId = resolveWikiModeId(rawMode);
  if (!getWikiMode(modeId)) {
    throw new ApiError(400, "UNKNOWN_WIKI_MODE", `Unknown wiki mode: ${rawMode}`);
  }
  return modeId;
}

export function registerWikiModeServerAdapter(adapter: WikiModeServerAdapter): void {
  serverAdaptersByMode.set(adapter.modeId, adapter);
}
