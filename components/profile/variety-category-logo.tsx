import Image from "next/image";

import { VARIETY_CATEGORY_LOGOS, type ProfileVarietyScope } from "@/lib/profile-elo-categories";

import { cn } from "@/utils/cn";

const LARGE_LOGO_SCOPES = new Set<ProfileVarietyScope>(["star-wars", "marvel"]);

function logoImageClassName(scope: ProfileVarietyScope, size: "default" | "lg" = "default"): string {
  if (size === "lg") {
    if (scope === "league") {
      return "h-12 w-12 scale-[1.22]";
    }
    if (LARGE_LOGO_SCOPES.has(scope)) {
      return "h-11 w-11 scale-125";
    }
    return "h-11 w-11 scale-[1.12]";
  }

  if (scope === "league") {
    return "h-11 w-11 scale-[1.15]";
  }
  if (LARGE_LOGO_SCOPES.has(scope)) {
    return "h-9 w-9 scale-110";
  }
  return "h-8 w-8";
}

export function VarietyCategoryLogo({
  scope,
  className,
  badgeClassName,
  size = "default",
}: {
  scope: ProfileVarietyScope;
  className?: string;
  badgeClassName?: string;
  size?: "default" | "lg";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)]/80 bg-[var(--surface-elevated)]",
        badgeClassName,
        className,
      )}
      aria-hidden
    >
      <Image
        src={VARIETY_CATEGORY_LOGOS[scope]}
        alt=""
        width={size === "lg" ? 56 : 48}
        height={size === "lg" ? 56 : 48}
        unoptimized
        className={cn("object-contain", logoImageClassName(scope, size))}
      />
    </span>
  );
}
