"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";
import { getRaceTierLabel } from "@/lib/race-tier";
import { RaceModeCard } from "./RaceModeCard";
import { RaceTierInfo } from "./RaceTierInfo";
import type { RaceModeSummary } from "./race-mode-types";

interface RaceModeSelectionProps {
  modes: RaceModeSummary[];
  onSelectMode: (modeId: string) => void;
  statsLoading?: boolean;
}

const MODE_BUTTON_LABELS: Record<string, string> = {
  wikipedia: "Wikipedia",
  minecraft: "Minecraft",
  league: "League of Legends",
  pokemon: "Pokemon",
  "star-wars": "Star Wars",
  starwars: "Star Wars",
  marvel: "Marvel",
};

export function RaceModeSelection({ modes, onSelectMode, statsLoading = false }: RaceModeSelectionProps) {
  const [selectedModeId, setSelectedModeId] = useState(modes[0]?.id ?? "wikipedia");
  const selectedMode = modes.find((mode) => mode.id === selectedModeId) ?? modes[0];
  const selectedRating = selectedMode?.rating ?? 1000;
  const rankStatus = getRaceTierLabel(selectedRating);
  const selectedModeLabel = MODE_BUTTON_LABELS[selectedMode?.id ?? "wikipedia"] ?? selectedMode?.name ?? "Mode";

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-8 md:py-10">
      <header className="mb-6 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">Race</h1>
        <p className="max-w-2xl text-sm text-[var(--muted)] md:text-base">
          Choose a wiki and race from a start page to a target page.
        </p>
      </header>

      <div className="mb-6 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{selectedModeLabel} Rating</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
          {statsLoading ? (
            <>
              <Skeleton className="h-8 w-28" aria-label="Loading rating" />
              <Skeleton className="h-5 w-24" aria-hidden />
            </>
          ) : (
            <>
              <p className="text-2xl font-semibold text-[var(--foreground)]">{selectedRating} ELO</p>
              <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--accent)]">
                {rankStatus}
                <RaceTierInfo />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {modes.map((mode) => {
          const isSelected = mode.id === selectedModeId;
          return (
            <Button
              key={mode.id}
              type="button"
              size="sm"
              variant={isSelected ? "default" : "outline"}
              className={cn(!mode.enabled && !isSelected && "opacity-70")}
              onClick={() => setSelectedModeId(mode.id)}
            >
              {MODE_BUTTON_LABELS[mode.id] ?? mode.name}
            </Button>
          );
        })}
      </div>

      {selectedMode ? (
        <RaceModeCard mode={selectedMode} statsLoading={statsLoading} onStart={() => onSelectMode(selectedMode.id)} />
      ) : null}
    </section>
  );
}
