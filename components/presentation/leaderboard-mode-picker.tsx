"use client";

import Image from "next/image";
import {
  LEADERBOARD_SCOPE_LABELS,
  LEADERBOARD_SCOPES,
  type LeaderboardScope,
} from "@/lib/leaderboard-scopes";
import { getLeaderboardScopeTheme } from "@/lib/leaderboard-scope-theme";
import { cn } from "@/utils/cn";

const COMPACT_LOGO_CLASS: Partial<Record<LeaderboardScope, string>> = {
  league: "h-10 w-10 scale-[1.4]",
  "star-wars": "h-12 w-12 scale-125",
  marvel: "h-12 w-12 scale-125",
};

export function LeaderboardModePicker({
  selectedScope,
  onSelectScope,
}: {
  selectedScope: LeaderboardScope;
  onSelectScope: (scope: LeaderboardScope) => void;
}) {
  return (
    <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-3">
      {LEADERBOARD_SCOPES.map((scope) => {
        const isSelected = selectedScope === scope;
        const theme = getLeaderboardScopeTheme(scope);

        return (
          <button
            key={scope}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelectScope(scope)}
            className={cn(
              "flex min-h-[4.75rem] flex-col items-center justify-center gap-2 rounded-[var(--radius-sm)] border px-2 py-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:min-h-0",
              isSelected ? theme.selected : theme.unselected,
            )}
          >
            <Image
              src={theme.logo}
              alt=""
              width={48}
              height={48}
              unoptimized
              className={cn("shrink-0 object-contain", COMPACT_LOGO_CLASS[scope] ?? "h-10 w-10")}
              aria-hidden
            />
            <span className="text-xs font-medium leading-tight sm:text-sm">{LEADERBOARD_SCOPE_LABELS[scope]}</span>
          </button>
        );
      })}
    </div>
  );
}
