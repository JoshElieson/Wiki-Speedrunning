"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Medal, Trophy } from "lucide-react";
import { getLeaderboardPlayerLabel } from "@/lib/leaderboard-display";
import { LEADERBOARD_PODIUM_MEDALS } from "@/lib/leaderboard-medals";
import type { LeaderboardRow } from "@/types/domain";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";

const PODIUM_ORDER = [2, 1, 3] as const;

/**
 * Platform block heights (82% / 66% / 48% of the tallest step).
 */
const PLATFORM_HEIGHT: Record<1 | 2 | 3, string> = {
  1: "h-[14.85rem] sm:h-[15.95rem]",
  2: "h-[11.1rem] sm:h-[11.9rem]",
  3: "h-[8.9rem] sm:h-[9.6rem]",
};

const COLUMN_WIDTH: Record<1 | 2 | 3, string> = {
  1: "w-[6.25rem] sm:w-[7.5rem] md:w-[8.5rem]",
  2: "w-[5.75rem] sm:w-[6.75rem] md:w-[7.75rem]",
  3: "w-[5.5rem] sm:w-[6.5rem] md:w-[7.5rem]",
};

const PLATFORM_METAL: Record<
  1 | 2 | 3,
  { platform: string; border: string; badge: string; highlight: string; watermark: string }
> = {
  1: {
    platform: "bg-gradient-to-b from-[#fcf8ee] via-[#f5ebcc] to-[#e8d6a0]",
    border: "border-[#d4c48a]",
    badge: "border-[#d4c48a]/45 bg-[#fcf8ee] text-[#7a6528]",
    highlight: "bg-gradient-to-r from-transparent via-[#fffdf7]/85 to-transparent",
    watermark: "text-[#8a7332]",
  },
  2: {
    platform: "bg-gradient-to-b from-[#f9fafc] via-[#eceff4] to-[#d2dae5]",
    border: "border-[#b5c0cf]",
    badge: "border-[#b5c0cf]/50 bg-[#f9fafc] text-[#5a6575]",
    highlight: "bg-gradient-to-r from-transparent via-white/80 to-transparent",
    watermark: "text-[#6b7788]",
  },
  3: {
    platform: "bg-gradient-to-b from-[#faf5ee] via-[#f0e2cf] to-[#d9c0a0]",
    border: "border-[#c4a882]",
    badge: "border-[#c4a882]/45 bg-[#faf5ee] text-[#735a3a]",
    highlight: "bg-gradient-to-r from-transparent via-[#fffaf4]/80 to-transparent",
    watermark: "text-[#8a6b45]",
  },
};

function PodiumPlayer({
  rank,
  label,
  medalClass,
  player,
}: {
  rank: 1 | 2 | 3;
  label: string;
  medalClass: string;
  player: LeaderboardRow | undefined;
}) {
  const isWinner = rank === 1;
  const PlaceIcon = isWinner ? Trophy : Medal;
  const metal = PLATFORM_METAL[rank];

  return (
    <div className="mb-2 w-full shrink-0 px-0.5 text-center">
      <div className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5", metal.badge)}>
        <PlaceIcon className={cn("h-3 w-3 shrink-0", medalClass)} aria-hidden />
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.16em]">{label}</span>
      </div>

      <div className="mt-1 min-w-0 w-full">
        {player ? (
          <>
            <Link
              href={`/profile/${player.username}`}
              className={cn(
                "block truncate font-semibold tracking-tight text-[var(--foreground)] transition-colors hover:text-[var(--accent)]",
                isWinner ? "text-sm sm:text-base" : "text-xs sm:text-sm",
              )}
            >
              {getLeaderboardPlayerLabel(player)}
            </Link>
            <p className="text-[0.65rem] text-[var(--muted)] sm:text-xs">{player.rating} rating</p>
          </>
        ) : (
          <>
            <p
              className={cn(
                "font-semibold tracking-tight text-[var(--foreground)]",
                isWinner ? "text-sm sm:text-base" : "text-xs sm:text-sm",
              )}
            >
              —
            </p>
            <p className="text-[0.65rem] text-[var(--muted)]">Awaiting results</p>
          </>
        )}
      </div>
    </div>
  );
}

function PodiumPlatform({ rank }: { rank: 1 | 2 | 3 }) {
  const isWinner = rank === 1;
  const metal = PLATFORM_METAL[rank];

  return (
    <div className={cn("w-full shrink-0", PLATFORM_HEIGHT[rank], isWinner && "z-10")}>
      <div
        className={cn(
          "relative h-full w-full overflow-hidden rounded-t-[var(--radius-sm)] border border-b-0",
          metal.platform,
          metal.border,
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.7),var(--shadow-soft)]",
          isWinner && "shadow-[inset_0_1px_0_rgba(255,255,255,0.8),var(--shadow-lifted)]",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-2 text-center font-semibold tabular-nums opacity-[0.18]",
            metal.watermark,
            isWinner ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl",
          )}
        >
          {rank}
        </span>
        <span aria-hidden className={cn("pointer-events-none absolute inset-x-3 top-0 h-px", metal.highlight)} />
      </div>
    </div>
  );
}

function PodiumColumn({
  rank,
  label,
  medalClass,
  player,
  ariaLabel,
}: {
  rank: 1 | 2 | 3;
  label: string;
  medalClass: string;
  player: LeaderboardRow | undefined;
  ariaLabel: string;
}) {
  return (
    <div
      aria-label={ariaLabel}
      className={cn("flex flex-col", COLUMN_WIDTH[rank], rank === 1 && "z-10")}
    >
      <PodiumPlayer rank={rank} label={label} medalClass={medalClass} player={player} />
      <PodiumPlatform rank={rank} />
    </div>
  );
}

export function LeaderboardPodium({ players, delay = 0 }: { players: LeaderboardRow[]; delay?: number }) {
  const podiumByRank = new Map(
    LEADERBOARD_PODIUM_MEDALS.map((medal) => [medal.rank, { ...medal, player: players[medal.rank - 1] }] as const),
  );

  return (
    <motion.div
      className="flex h-full min-h-0 w-full flex-col"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.28 }}
    >
      <Card className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden px-4 pt-4 pb-0">
        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[var(--muted)] sm:text-base">Top Players</p>

        <div className="flex h-full min-h-0 flex-col justify-end">
          <div className="mx-auto flex w-full max-w-md items-end justify-center gap-1 px-1 pt-2 pb-1 sm:gap-2.5 md:gap-4">
          {PODIUM_ORDER.map((rank) => {
            const medal = podiumByRank.get(rank);
            if (!medal) return null;
            const { label, medalClass, player, ariaLabel } = medal;
            return (
              <PodiumColumn
                key={`podium-${rank}`}
                rank={rank}
                label={label}
                medalClass={medalClass}
                player={player}
                ariaLabel={ariaLabel}
              />
            );
          })}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
