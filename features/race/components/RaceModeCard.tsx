"use client";

import Image from "next/image";
import { Lock } from "lucide-react";
import { VarietyCategoryLogo } from "@/components/profile/variety-category-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getRaceModeTheme } from "@/lib/race-mode-config";
import { getRaceTierLabel, getRaceTierProgress } from "@/lib/race-tier";
import { cn } from "@/utils/cn";
import { formatDuration } from "@/utils/format";
import type { RaceModeSummary } from "./race-mode-types";

interface RaceModeCardProps {
  mode: RaceModeSummary;
  onStart: () => void;
}

function tagBadgeVariant(tag: string): "default" | "neutral" | "purple" {
  if (tag === "Classic") return "purple";
  if (tag === "Coming Soon") return "neutral";
  return "default";
}

function RaceModeIcon({ logo, badgeClassName, large }: { logo: string; badgeClassName: string; large?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)]/80",
        large ? "h-14 w-14" : "h-12 w-12",
        badgeClassName,
      )}
      aria-hidden
    >
      <Image
        src={logo}
        alt=""
        width={56}
        height={56}
        className={cn("object-contain", large ? "h-12 w-12 scale-105" : "h-10 w-10")}
      />
    </span>
  );
}

function StatCell({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("flex flex-col justify-center px-4 py-3", className)}>
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums leading-none tracking-tight text-[var(--foreground)]">{value}</p>
    </div>
  );
}

export function RaceModeCard({ mode, onStart }: RaceModeCardProps) {
  const theme = getRaceModeTheme(mode.id);
  const tierLabel = getRaceTierLabel(mode.rating);
  const tierProgress = getRaceTierProgress(mode.rating);
  const displayTags = mode.tags.filter((tag) => tag !== "Coming Soon");

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow-lifted)]",
        !mode.enabled && "opacity-[0.97]",
      )}
    >
      <span className={cn("pointer-events-none absolute inset-x-0 top-0 h-0.5", theme.accent.topBorder)} aria-hidden />
      <span
        className={cn("pointer-events-none absolute right-5 top-5 h-1.5 w-1.5 rounded-full", theme.accent.dot)}
        aria-hidden
      />

      <div className="grid min-h-[17.5rem] lg:grid-cols-[minmax(0,1fr)_13.5rem]">
        <div className="flex min-h-0 flex-col p-5 md:p-6 lg:border-r lg:border-[var(--border)]">
          <div className="flex items-start gap-3.5">
            {theme.varietyScope ? (
              <VarietyCategoryLogo
                scope={theme.varietyScope}
                badgeClassName={theme.accent.badgeBg}
                className="h-14 w-14"
                size="lg"
              />
            ) : (
              <RaceModeIcon logo={theme.logo} badgeClassName={theme.accent.badgeBg} large />
            )}
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {displayTags.map((tag) => (
                  <Badge key={`${mode.id}-${tag}`} variant={tagBadgeVariant(tag)}>
                    {tag}
                  </Badge>
                ))}
                <Badge variant={mode.enabled ? "success" : "neutral"}>{mode.enabled ? "Available" : "Locked"}</Badge>
              </div>
              <h2 className="mt-2 text-xl font-semibold leading-tight tracking-tight text-[var(--foreground)] md:text-2xl">
                {theme.displayTitle}
              </h2>
            </div>
          </div>

          <p className="mt-3 max-w-xl text-sm leading-snug text-[var(--muted)]">{mode.description}</p>

          <div className="mt-4 space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--foreground)]">{tierLabel}</p>
              {mode.enabled && tierProgress.nextTierLabel ? (
                <p className="text-xs text-[var(--muted)]">
                  {tierProgress.pointsToNext} ELO to {tierProgress.nextTierLabel.replace(" Tier", "")}
                </p>
              ) : null}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-soft)]">
              <div
                className={cn("h-full rounded-full transition-[width]", theme.accent.progressBar)}
                style={{ width: `${tierProgress.progressPercent}%` }}
                role="progressbar"
                aria-valuenow={tierProgress.progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progress toward ${tierProgress.nextTierLabel ?? "max tier"}`}
              />
            </div>
          </div>

          <div className="mt-auto border-t border-[var(--border)]/80 pt-4">
            <Button
              type="button"
              size="lg"
              disabled={!mode.enabled}
              className={cn(
                "h-11 w-full sm:w-auto sm:min-w-[13.5rem]",
                mode.enabled ? theme.accent.ctaEnabled : "border-[var(--border-strong)] bg-[var(--surface-elevated)] text-[var(--muted)]",
              )}
              onClick={onStart}
            >
              {!mode.enabled ? (
                <span className="inline-flex items-center gap-2">
                  <Lock className="h-4 w-4" aria-hidden />
                  Coming Soon
                </span>
              ) : (
                mode.ctaLabel
              )}
            </Button>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {mode.enabled
                ? `${mode.runs} completed run${mode.runs === 1 ? "" : "s"} on record`
                : "This wiki mode is in development and will unlock later."}
            </p>
          </div>
        </div>

        <div className={cn("flex flex-col border-t border-[var(--border)] lg:border-t-0", theme.accent.statPanel)}>
          <StatCell label="Rating" value={`${mode.rating} ELO`} className="border-b border-[var(--border)]/70" />
          <StatCell label="Runs" value={String(mode.runs)} className="border-b border-[var(--border)]/70" />
          <StatCell
            label="Best time"
            value={mode.bestTime ? formatDuration(mode.bestTime) : "—"}
            className="flex-1"
          />
        </div>
      </div>
    </article>
  );
}
