export const WIKIPEDIA_ELO_SCOPE = "wikipedia";

export type VarietyCategoryAccent = {
  topBorder: string;
  badgeBg: string;
  dot: string;
  /** Muted text color for hero and other inline emphasis */
  heroText: string;
};

export const PROFILE_VARIETY_CATEGORIES = [
  {
    scope: "minecraft",
    label: "Minecraft",
    logo: "/logos/variety/minecraft.png",
    subtitle: "Variety category",
    accent: {
      topBorder: "bg-emerald-600/55",
      badgeBg: "bg-emerald-700/[0.06]",
      dot: "bg-emerald-600/70",
      heroText: "text-emerald-700/80",
    },
  },
  {
    scope: "league",
    label: "League of Legends",
    logo: "/logos/variety/league.png",
    subtitle: "Variety category",
    accent: {
      topBorder: "bg-[#C89B3C]/60",
      badgeBg: "bg-[#C89B3C]/[0.08]",
      dot: "bg-[#C89B3C]/75",
      heroText: "text-[#8f7340]/85",
    },
  },
  {
    scope: "pokemon",
    label: "Pokémon",
    logo: "/logos/variety/pokemon.png",
    subtitle: "Variety category",
    accent: {
      topBorder: "bg-blue-600/50",
      badgeBg: "bg-blue-700/[0.05]",
      dot: "bg-blue-600/65",
      heroText: "text-blue-700/75",
    },
  },
  {
    scope: "star-wars",
    label: "Star Wars",
    logo: "/logos/variety/star-wars.png",
    subtitle: "Universe rating",
    accent: {
      topBorder: "bg-yellow-500/55",
      badgeBg: "bg-yellow-600/[0.08]",
      dot: "bg-yellow-500/70",
      heroText: "text-amber-700/75",
    },
  },
  {
    scope: "marvel",
    label: "Marvel",
    logo: "/logos/variety/marvel.png",
    subtitle: "Universe rating",
    accent: {
      topBorder: "bg-rose-500/50",
      badgeBg: "bg-rose-500/[0.06]",
      dot: "bg-rose-500/65",
      heroText: "text-rose-700/75",
    },
  },
] as const;

export type ProfileVarietyScope = (typeof PROFILE_VARIETY_CATEGORIES)[number]["scope"];

export const VARIETY_CATEGORY_LOGOS: Record<ProfileVarietyScope, string> = Object.fromEntries(
  PROFILE_VARIETY_CATEGORIES.map((category) => [category.scope, category.logo]),
) as Record<ProfileVarietyScope, string>;

export const PROFILE_VARIETY_SCOPES: ProfileVarietyScope[] = PROFILE_VARIETY_CATEGORIES.map(
  (category) => category.scope,
);

const varietyCategoryByScope = Object.fromEntries(
  PROFILE_VARIETY_CATEGORIES.map((category) => [category.scope, category]),
) as Record<ProfileVarietyScope, (typeof PROFILE_VARIETY_CATEGORIES)[number]>;

export function getVarietyCategoryMeta(scope: ProfileVarietyScope) {
  return varietyCategoryByScope[scope];
}

export type HeroRotatingWord = {
  word: string;
  accentClass: string;
};

export const HERO_ROTATING_WORDS: HeroRotatingWord[] = [
  { word: "Wikipedia", accentClass: "text-[var(--accent)]" },
  ...PROFILE_VARIETY_CATEGORIES.map((category) => ({
    word: category.label,
    accentClass: category.accent.heroText,
  })),
];
