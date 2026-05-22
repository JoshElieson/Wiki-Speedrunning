"use client";

import { Info } from "lucide-react";
import { formatRaceTierRatingRange, RACE_TIER_BANDS } from "@/lib/race-tier";
import { cn } from "@/utils/cn";

export function RaceTierInfo({ className }: { className?: string }) {
  return (
    <span className={cn("group relative inline-flex align-middle", className)}>
      <button
        type="button"
        className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        aria-describedby="race-tier-ranges-tooltip"
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only">View all rating tiers and ELO ranges</span>
      </button>

      <div
        id="race-tier-ranges-tooltip"
        role="tooltip"
        className="pointer-events-none invisible absolute right-0 bottom-full z-20 mb-1.5 w-[13.5rem] rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2.5 text-left opacity-0 shadow-[var(--shadow-lifted)] transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Rating tiers</p>
        <ul className="mt-2 space-y-1.5">
          {RACE_TIER_BANDS.map((band) => (
            <li key={band.label} className="flex items-baseline justify-between gap-3 text-xs">
              <span className="font-medium text-[var(--foreground)]">{band.label.replace(" Tier", "")}</span>
              <span className="tabular-nums text-[var(--muted)]">{formatRaceTierRatingRange(band.min, band.next)}</span>
            </li>
          ))}
        </ul>
      </div>
    </span>
  );
}
