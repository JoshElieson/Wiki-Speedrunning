import { DEFAULT_ELO } from "@/lib/elo";

import { eloScopeFromWikiModeId, WIKIPEDIA_ELO_SCOPE } from "@/lib/mode-ratings";

import type { ProfileSnapshot } from "@/types/domain";

import type { RaceModeSummary } from "@/features/race/components/race-mode-types";

import { ALL_WIKI_MODES } from "./registry";

import type { WikiModeId } from "./types";



export interface RaceModeProfileStats {

  wikipediaRating: number;

  wikipediaBestTimeMs: number | null;

  wikipediaRuns: number;

  categoryRatings: Map<string, number>;

  modeBestTimeMs: Map<string, number | null>;

  modeRuns: Map<string, number>;

}



export function profileToRaceModeStats(profile: ProfileSnapshot | undefined): RaceModeProfileStats {

  const categoryRatings = new Map(

    (profile?.categoryElos ?? []).map((entry) => [entry.scope, entry.rating]),

  );



  if (profile?.eloByMode) {

    for (const [scope, rating] of Object.entries(profile.eloByMode)) {

      categoryRatings.set(scope, rating);

    }

    categoryRatings.set(WIKIPEDIA_ELO_SCOPE, profile.eloByMode[WIKIPEDIA_ELO_SCOPE]);

  }



  const modeBestTimeMs = new Map<string, number | null>();

  const modeRuns = new Map<string, number>();



  if (profile?.statsByMode) {

    for (const [scope, stats] of Object.entries(profile.statsByMode)) {

      modeBestTimeMs.set(scope, stats.bestTimeMs > 0 ? stats.bestTimeMs : null);

      modeRuns.set(scope, stats.completedRuns);

    }

  }



  const wikipediaStats = profile?.statsByMode?.[WIKIPEDIA_ELO_SCOPE];

  const wikipediaBestTime =

    wikipediaStats && wikipediaStats.bestTimeMs > 0

      ? wikipediaStats.bestTimeMs

      : (profile?.bestTimeMs ?? 0) > 0

        ? (profile?.bestTimeMs ?? null)

        : null;



  return {

    wikipediaRating: profile?.rating ?? profile?.eloByMode?.[WIKIPEDIA_ELO_SCOPE] ?? DEFAULT_ELO,

    wikipediaBestTimeMs: wikipediaBestTime,

    wikipediaRuns: wikipediaStats?.completedRuns ?? profile?.totalRuns ?? 0,

    categoryRatings,

    modeBestTimeMs,

    modeRuns,

  };

}



function statsForMode(modeId: WikiModeId, stats: RaceModeProfileStats): Pick<RaceModeSummary, "rating" | "bestTime" | "runs"> {

  const scope = eloScopeFromWikiModeId(modeId);



  if (modeId === "wikipedia") {

    return {

      rating: stats.wikipediaRating,

      bestTime: stats.wikipediaBestTimeMs,

      runs: stats.wikipediaRuns,

    };

  }



  return {

    rating: stats.categoryRatings.get(scope) ?? DEFAULT_ELO,

    bestTime: stats.modeBestTimeMs.get(scope) ?? null,

    runs: stats.modeRuns.get(scope) ?? 0,

  };

}



export function buildRaceModeSummaries(stats: RaceModeProfileStats): RaceModeSummary[] {

  return ALL_WIKI_MODES.map((mode) => {

    const modeStats = statsForMode(mode.id, stats);

    return {

      id: mode.id,

      name: mode.displayName,

      description: mode.description,

      rating: modeStats.rating,

      bestTime: modeStats.bestTime,

      runs: modeStats.runs,

      enabled: mode.enabled,

      tags: [...mode.tags],

      ctaLabel: mode.ctaLabel,

    };

  });

}



/** @internal Ensures wikipedia ELO scope stays wired for profile queries. */

export const WIKIPEDIA_PROFILE_SCOPE = WIKIPEDIA_ELO_SCOPE;

