import { DifficultyBadge } from "@/components/presentation/difficulty-badge";
import { RoutePathChips } from "@/components/presentation/route-path-chips";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { stripWikiDisambiguation } from "@/features/wiki/services/title-normalization";
import type { ChallengeDescriptor } from "@/types/domain";
import { cn } from "@/utils/cn";

export function ChallengeCard({
  challenge,
  compact = false,
  hideBadges = false,
  hideTitle = false,
  interactive = true,
  className,
}: {
  challenge: ChallengeDescriptor;
  compact?: boolean;
  hideBadges?: boolean;
  hideTitle?: boolean;
  interactive?: boolean;
  className?: string;
}) {
  const startLabel = stripWikiDisambiguation(challenge.startTitle);
  const targetLabel = stripWikiDisambiguation(challenge.targetTitle);

  return (
    <Card className={cn(compact ? "p-4" : "p-6", className)} interactive={interactive}>
      {!hideBadges ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="neutral">{challenge.source === "daily" ? "Daily Seed" : "Generated"}</Badge>
          <DifficultyBadge tier={challenge.difficultyTier} score={challenge.difficultyScore} />
          {challenge.shortestPathHint ? <Badge variant="purple">Hint {challenge.shortestPathHint} hops</Badge> : null}
        </div>
      ) : null}

      {!hideTitle ? (
        <h3
          className={`${hideBadges ? "" : "mt-4 "}text-xl font-semibold tracking-tight text-[var(--foreground)]`}
        >
          {challenge.label}
        </h3>
      ) : null}
      <p className={`${hideTitle ? (hideBadges ? "" : "mt-0 ") : "mt-2 "}text-sm text-[var(--muted)]`}>
        Race from <span className="font-medium text-[var(--foreground)]">{startLabel}</span> to{" "}
        <span className="font-medium text-[var(--foreground)]">{targetLabel}</span>.
      </p>

      <div className="mt-4">
        <RoutePathChips path={[startLabel, "…", targetLabel]} />
      </div>
    </Card>
  );
}
