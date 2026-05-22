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
    ctaFill: string;
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
      "border-black bg-white text-black shadow-none hover:border-zinc-500 hover:bg-white hover:text-white active:bg-white",
    ctaFill: "bg-zinc-500",
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
      ctaFill: getVarietyCtaFillClass(scope),
    },
  };
}

function getVarietyCtaClass(scope: ProfileVarietyScope): string {
  switch (scope) {
    case "minecraft":
      return "border-emerald-700 bg-transparent text-emerald-300 shadow-none hover:border-emerald-700 hover:text-white";
    case "league":
      return "border-[#C89B3C] bg-transparent text-[#C89B3C] shadow-none hover:border-[#C89B3C] hover:text-[#1a1408]";
    case "pokemon":
      return "border-blue-700 bg-transparent text-blue-400 shadow-none hover:border-blue-700 hover:text-white";
    case "star-wars":
      return "border-yellow-500 bg-transparent text-yellow-400 shadow-none hover:border-yellow-500 hover:text-[#1a1408]";
    case "marvel":
      return "border-rose-600 bg-transparent text-rose-400 shadow-none hover:border-rose-600 hover:text-white";
  }
}

function getVarietyCtaFillClass(scope: ProfileVarietyScope): string {
  switch (scope) {
    case "minecraft":
      return "bg-emerald-700";
    case "league":
      return "bg-[#C89B3C]";
    case "pokemon":
      return "bg-blue-700";
    case "star-wars":
      return "bg-yellow-500";
    case "marvel":
      return "bg-rose-600";
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
