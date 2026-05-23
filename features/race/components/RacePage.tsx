"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { buildRaceModeSummaries, getWikiModeId, type WikiModeId, profileToRaceModeStats } from "@/lib/wiki-modes";
import type { ProfileSnapshot } from "@/types/domain";

import { RaceLoadingSpinner } from "./RaceLoadingSpinner";
import { RaceModeSelection } from "./RaceModeSelection";

const WikipediaRaceRunner = dynamic(
  () => import("./WikipediaRaceRunner").then((module) => module.WikipediaRaceRunner),
  {
    loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center">
        <RaceLoadingSpinner label="Loading race" />
      </div>
    ),
  },
);

type RaceTabView = "modeSelection" | "activeRace";

function safeSearchParam(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveModeFromSearchParam(raw: string | null): WikiModeId {
  try {
    return getWikiModeId(raw ?? "wikipedia");
  } catch {
    return "wikipedia";
  }
}

function hasRaceUrlParams(searchParams: URLSearchParams): boolean {
  return Boolean(safeSearchParam(searchParams.get("start")) && safeSearchParam(searchParams.get("target")));
}

export function RacePage({ initialProfile = null }: { initialProfile?: ProfileSnapshot | null }) {
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const username = session?.user?.username;
  const [view, setView] = useState<RaceTabView>("modeSelection");
  const [activeMode, setActiveMode] = useState<WikiModeId>("wikipedia");

  useEffect(() => {
    if (hasRaceUrlParams(searchParams)) {
      setActiveMode(resolveModeFromSearchParam(searchParams.get("mode")));
      setView("activeRace");
    }
  }, [searchParams]);

  const resolvedInitialProfile =
    initialProfile && (!username || initialProfile.username === username) ? initialProfile : undefined;

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
    initialData: resolvedInitialProfile,
    retry: 1,
  });

  const profile = profileQuery.data ?? resolvedInitialProfile;
  const isSignedIn = Boolean(initialProfile) || (sessionStatus === "authenticated" && Boolean(session?.user));
  const isLoadingStats = isSignedIn && !profile && (sessionStatus === "loading" || profileQuery.isLoading);
  const profileStats = useMemo(() => profileToRaceModeStats(profile), [profile]);
  const raceModes = useMemo(() => buildRaceModeSummaries(profileStats), [profileStats]);
  if (view === "activeRace") {
    return <WikipediaRaceRunner modeId={activeMode} onReturnToSelection={() => setView("modeSelection")} />;
  }

  return (
    <RaceModeSelection
      modes={raceModes}
      statsLoading={isLoadingStats}
      onSelectMode={(modeId) => {
        const selected = raceModes.find((mode) => mode.id === modeId);
        if (!selected?.enabled) {
          return;
        }
        setActiveMode(getWikiModeId(modeId));
        setView("activeRace");
      }}
    />
  );
}
