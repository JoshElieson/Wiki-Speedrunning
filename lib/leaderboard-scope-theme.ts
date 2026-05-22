import { VARIETY_CATEGORY_LOGOS, type ProfileVarietyScope } from "@/lib/profile-elo-categories";
import type { LeaderboardScope } from "@/lib/leaderboard-scopes";

type LeaderboardScopeTheme = {
  logo: string;
  selected: string;
  unselected: string;
};

const UNSELECTED_BUTTON =
  "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]";

const WIKIPEDIA_THEME: LeaderboardScopeTheme = {
  logo: "/logos/brand-icon.png",
  selected:
    "border-zinc-500 bg-zinc-500 text-white shadow-[var(--shadow-soft)] hover:border-zinc-600 hover:bg-zinc-600",
  unselected: UNSELECTED_BUTTON,
};

const VARIETY_SELECTED: Record<ProfileVarietyScope, string> = {
  minecraft:
    "border-emerald-600 bg-emerald-600 text-white shadow-[var(--shadow-soft)] hover:border-emerald-700 hover:bg-emerald-700",
  league:
    "border-[#C89B3C] bg-[#C89B3C] text-[#1a1408] shadow-[var(--shadow-soft)] hover:border-[#b88935] hover:bg-[#b88935]",
  pokemon: "border-blue-600 bg-blue-600 text-white shadow-[var(--shadow-soft)] hover:border-blue-700 hover:bg-blue-700",
  "star-wars":
    "border-yellow-500 bg-yellow-500 text-[#1a1408] shadow-[var(--shadow-soft)] hover:border-yellow-600 hover:bg-yellow-600",
  marvel:
    "border-rose-500 bg-rose-500 text-white shadow-[var(--shadow-soft)] hover:border-rose-600 hover:bg-rose-600",
};

export function getLeaderboardScopeTheme(scope: LeaderboardScope): LeaderboardScopeTheme {
  if (scope === "wikipedia") {
    return WIKIPEDIA_THEME;
  }

  return {
    logo: VARIETY_CATEGORY_LOGOS[scope],
    selected: VARIETY_SELECTED[scope],
    unselected: UNSELECTED_BUTTON,
  };
}
