"use client";

import { cn } from "@/utils/cn";

interface GhostProgressBarProps {
  progressPercent: number;
  isFinished: boolean;
  className?: string;
}

export function GhostProgressBar({ progressPercent, isFinished, className }: GhostProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(progressPercent, 100));

  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-elevated)]", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300",
          isFinished ? "bg-[#3f7a54]" : "bg-[var(--accent)]",
        )}
        style={{ width: `${clampedProgress}%` }}
      />
    </div>
  );
}
