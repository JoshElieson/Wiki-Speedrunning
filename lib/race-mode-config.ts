import {
  getVarietyCategoryMeta,
  type ProfileVarietyScope,
  type VarietyCategoryAccent,
} from "@/lib/profile-elo-categories";

export type RaceModeId = "wikipedia" | "minecraft" | "league" | "pokemon" | "starwars" | "marvel";

export type RaceModeTheme = {
  id: RaceModeId;
  displayTitle: string;
  logo: string;
  accent: VarietyCategoryAccent & {
    progressBar: string;
    statPanel: string;
    ctaEnabled: string;
  };
  varietyScope: ProfileVarietyScope | null;
};

const WIKIPEDIA_THEME: RaceModeTheme = {
  id: "wikipedia",
  displayTitle: "Wikipedia Speedrun",
  logo: "/logos/brand-icon.png",
  varietyScope: null,
  accent: {
    topBorder: "bg-[var(--accent)]/55",
    badgeBg: "bg-[var(--accent-soft)]",
    dot: "bg-[var(--accent)]/70",
    heroText: "text-[var(--accent)]",
    progressBar: "bg-[var(--accent)]",
    statPanel: "bg-[var(--accent-soft)]/35",
    ctaEnabled:
      "border-zinc-500 bg-zinc-500 text-white shadow-[var(--shadow-soft)] hover:border-zinc-600 hover:bg-zinc-600",
  },
};

const RACE_MODE_ID_TO_VARIETY_SCOPE: Record<Exclude<RaceModeId, "wikipedia">, ProfileVarietyScope> = {
  minecraft: "minecraft",
  league: "league",
  pokemon: "pokemon",
  starwars: "star-wars",
  marvel: "marvel",
};

const VARIETY_PROGRESS_BAR: Record<ProfileVarietyScope, string> = {
  minecraft: "bg-emerald-600",
  league: "bg-[#C89B3C]",
  pokemon: "bg-blue-600",
  "star-wars": "bg-yellow-500",
  marvel: "bg-rose-500",
};

function buildVarietyTheme(id: Exclude<RaceModeId, "wikipedia">, displayTitle: string): RaceModeTheme {
  const scope = RACE_MODE_ID_TO_VARIETY_SCOPE[id];
  const meta = getVarietyCategoryMeta(scope);

  return {
    id,
    displayTitle,
    logo: meta.logo,
    varietyScope: scope,
    accent: {
      ...meta.accent,
      progressBar: VARIETY_PROGRESS_BAR[scope],
      statPanel: meta.accent.badgeBg,
      ctaEnabled: getVarietyCtaClass(scope),
    },
  };
}

function getVarietyCtaClass(scope: ProfileVarietyScope): string {
  switch (scope) {
    case "minecraft":
      return "border-emerald-700 bg-emerald-700 text-white shadow-[var(--shadow-soft)] hover:bg-emerald-800";
    case "league":
      return "border-[#C89B3C] bg-[#C89B3C] text-[#1a1408] shadow-[var(--shadow-soft)] hover:bg-[#b88935]";
    case "pokemon":
      return "border-blue-700 bg-blue-700 text-white shadow-[var(--shadow-soft)] hover:bg-blue-800";
    case "star-wars":
      return "border-yellow-500 bg-yellow-500 text-[#1a1408] shadow-[var(--shadow-soft)] hover:border-yellow-600 hover:bg-yellow-600";
    case "marvel":
      return "border-rose-600 bg-rose-600 text-white shadow-[var(--shadow-soft)] hover:bg-rose-700";
  }
}

const RACE_MODE_THEMES: Record<RaceModeId, RaceModeTheme> = {
  wikipedia: WIKIPEDIA_THEME,
  minecraft: buildVarietyTheme("minecraft", "Minecraft Wiki Speedrun"),
  league: buildVarietyTheme("league", "League of Legends Wiki Speedrun"),
  pokemon: buildVarietyTheme("pokemon", "Pokemon Wiki Speedrun"),
  starwars: buildVarietyTheme("starwars", "Star Wars Wiki Speedrun"),
  marvel: buildVarietyTheme("marvel", "Marvel Wiki Speedrun"),
};

export function getRaceModeTheme(modeId: string): RaceModeTheme {
  return RACE_MODE_THEMES[modeId as RaceModeId] ?? WIKIPEDIA_THEME;
}
