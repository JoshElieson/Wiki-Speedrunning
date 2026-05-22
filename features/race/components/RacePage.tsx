"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { DEFAULT_ELO } from "@/lib/elo";
import type { ProfileSnapshot } from "@/types/domain";
import { RaceModeSelection } from "./RaceModeSelection";
import { WikipediaRaceRunner } from "./WikipediaRaceRunner";
import type { RaceModeSummary } from "./race-mode-types";
import { getRaceTierLabel } from "@/lib/race-tier";

type RaceTabView = "modeSelection" | "activeRace";

export function RacePage() {
  const { data: session } = useSession();
  const username = session?.user?.username;
  const [view, setView] = useState<RaceTabView>("modeSelection");

  const profileQuery = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => {
      const response = await fetch(`/api/profile/${username}`);
      if (!response.ok) {
        throw new Error("Failed to load profile");
      }
      return (await response.json()) as ProfileSnapshot;
    },
    enabled: Boolean(username),
    retry: 1,
  });

  const categoryRatings = useMemo(() => {
    const entries = profileQuery.data?.categoryElos ?? [];
    return new Map(entries.map((entry) => [entry.scope, entry.rating]));
  }, [profileQuery.data?.categoryElos]);

  const wikipediaRating = profileQuery.data?.rating ?? DEFAULT_ELO;
  const wikipediaBestTime = (profileQuery.data?.bestTimeMs ?? 0) > 0 ? profileQuery.data?.bestTimeMs ?? null : null;
  const wikipediaRuns = profileQuery.data?.totalRuns ?? 0;
  const rankStatus = getRaceTierLabel(wikipediaRating);

  const raceModes = useMemo<RaceModeSummary[]>(
    () => [
      {
        id: "wikipedia",
        name: "Wikipedia",
        description: "Classic wiki speedrunning across the full encyclopedia.",
        rating: wikipediaRating,
        bestTime: wikipediaBestTime,
        runs: wikipediaRuns,
        enabled: true,
        tags: ["Ranked", "Classic"],
        ctaLabel: "Start Wikipedia Run",
      },
      {
        id: "minecraft",
        name: "Minecraft Wiki",
        description: "Race through blocks, mobs, items, and mechanics.",
        rating: categoryRatings.get("minecraft") ?? DEFAULT_ELO,
        bestTime: null,
        runs: 0,
        enabled: false,
        tags: ["Variety", "Coming Soon"],
        ctaLabel: "Start Run",
      },
      {
        id: "league",
        name: "League of Legends Wiki",
        description: "Navigate champions, items, abilities, and lore.",
        rating: categoryRatings.get("league") ?? DEFAULT_ELO,
        bestTime: null,
        runs: 0,
        enabled: false,
        tags: ["Variety", "Coming Soon"],
        ctaLabel: "Start Run",
      },
      {
        id: "pokemon",
        name: "Pokemon Wiki",
        description: "Speedrun through Pokemon, moves, regions, and types.",
        rating: categoryRatings.get("pokemon") ?? DEFAULT_ELO,
        bestTime: null,
        runs: 0,
        enabled: false,
        tags: ["Variety", "Coming Soon"],
        ctaLabel: "Start Run",
      },
      {
        id: "starwars",
        name: "Star Wars Wiki",
        description: "Explore characters, planets, ships, and timelines.",
        rating: categoryRatings.get("star-wars") ?? DEFAULT_ELO,
        bestTime: null,
        runs: 0,
        enabled: false,
        tags: ["Variety", "Coming Soon"],
        ctaLabel: "Start Run",
      },
      {
        id: "marvel",
        name: "Marvel Wiki",
        description: "Race through heroes, teams, villains, and story arcs.",
        rating: categoryRatings.get("marvel") ?? DEFAULT_ELO,
        bestTime: null,
        runs: 0,
        enabled: false,
        tags: ["Variety", "Coming Soon"],
        ctaLabel: "Start Run",
      },
    ],
    [categoryRatings, wikipediaBestTime, wikipediaRating, wikipediaRuns],
  );

  if (view === "activeRace") {
    return <WikipediaRaceRunner onReturnToSelection={() => setView("modeSelection")} />;
  }

  return (
    <RaceModeSelection
      modes={raceModes}
      primaryRating={wikipediaRating}
      rankStatus={rankStatus}
      onSelectMode={(modeId) => {
        if (modeId !== "wikipedia") {
          return;
        }
        setView("activeRace");
      }}
    />
  );
}
