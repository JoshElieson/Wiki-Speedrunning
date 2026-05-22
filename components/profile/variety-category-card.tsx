"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { VarietyCategoryLogo } from "@/components/profile/variety-category-logo";
import { getVarietyCategoryMeta, type ProfileVarietyScope } from "@/lib/profile-elo-categories";
import { cn } from "@/utils/cn";

const cardSurfaceClassName =
  "group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)] transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-lifted)]";

type VarietyCategoryCardProps = {
  scope: ProfileVarietyScope;
  name: string;
  elo: number;
  subtitle?: string;
  actionLabel?: string;
  href?: string;
  delay?: number;
  className?: string;
};

function VarietyCategoryCardContent({
  scope,
  name,
  elo,
  subtitle,
  actionLabel = "View stats",
}: Pick<VarietyCategoryCardProps, "scope" | "name" | "elo" | "subtitle" | "actionLabel">) {
  const meta = getVarietyCategoryMeta(scope);
  const resolvedSubtitle = subtitle ?? meta.subtitle;

  return (
    <>
      <span
        className={cn("pointer-events-none absolute inset-x-0 top-0 h-0.5", meta.accent.topBorder)}
        aria-hidden
      />
      <span
        className={cn(
          "pointer-events-none absolute right-4 top-4 h-1.5 w-1.5 rounded-full",
          meta.accent.dot,
        )}
        aria-hidden
      />

      <div className="flex items-start gap-3">
        <VarietyCategoryLogo scope={scope} badgeClassName={meta.accent.badgeBg} />
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="text-base font-semibold leading-tight tracking-normal text-[var(--foreground)]">
            {name}
          </h3>
          <p className="mt-0.5 text-xs leading-snug text-[var(--muted)]">{resolvedSubtitle}</p>
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tabular-nums tracking-tight text-[var(--foreground)]">
          {elo}
        </span>
        <span className="text-sm font-medium text-[var(--muted)]">ELO</span>
      </div>

      <p className="mt-auto pt-3 text-xs text-[var(--muted)] transition-colors duration-200 group-hover:text-[var(--foreground)]">
        <span>{actionLabel}</span>
        <span
          className="ml-0.5 inline-block transition-transform duration-200 group-hover:translate-x-0.5"
          aria-hidden
        >
          →
        </span>
      </p>
    </>
  );
}

export function VarietyCategoryCard({
  scope,
  name,
  elo,
  subtitle,
  actionLabel,
  href,
  delay = 0,
  className,
}: VarietyCategoryCardProps) {
  const motionProps = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.28 },
  };

  if (href) {
    return (
      <motion.div {...motionProps} className={className}>
        <Link href={href} className={cn(cardSurfaceClassName, "cursor-pointer")}>
          <VarietyCategoryCardContent
            scope={scope}
            name={name}
            elo={elo}
            subtitle={subtitle}
            actionLabel={actionLabel}
          />
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.article
      {...motionProps}
      className={cn(cardSurfaceClassName, "cursor-pointer", className)}
    >
      <VarietyCategoryCardContent
        scope={scope}
        name={name}
        elo={elo}
        subtitle={subtitle}
        actionLabel={actionLabel}
      />
    </motion.article>
  );
}
