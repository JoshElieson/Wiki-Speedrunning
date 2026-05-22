"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { RaceModeCard } from "./RaceModeCard";
import { RaceTierInfo } from "./RaceTierInfo";
import type { RaceModeSummary } from "./race-mode-types";

interface RaceModeSelectionProps {
  modes: RaceModeSummary[];
  primaryRating: number;
  rankStatus: string;
  onSelectMode: (modeId: string) => void;
}

const MODE_BUTTON_LABELS: Record<string, string> = {
  wikipedia: "Wikipedia",
  minecraft: "Minecraft",
  league: "League of Legends",
  pokemon: "Pokemon",
  starwars: "Star Wars",
  marvel: "Marvel",
};

export function RaceModeSelection({ modes, primaryRating, rankStatus, onSelectMode }: RaceModeSelectionProps) {
  const [selectedModeId, setSelectedModeId] = useState(modes[0]?.id ?? "wikipedia");
  const selectedMode = modes.find((mode) => mode.id === selectedModeId) ?? modes[0];

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-8 md:py-10">
      <header className="mb-6 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">Race</h1>
        <p className="max-w-2xl text-sm text-[var(--muted)] md:text-base">
          Choose a wiki and race from a start page to a target page.
        </p>
      </header>

      <div className="mb-6 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Main Wikipedia Rating</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
          <p className="text-2xl font-semibold text-[var(--foreground)]">{primaryRating} ELO</p>
          <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--accent)]">
            {rankStatus}
            <RaceTierInfo />
          </p>
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

      {selectedMode ? <RaceModeCard mode={selectedMode} onStart={() => onSelectMode(selectedMode.id)} /> : null}
    </section>
  );
}
