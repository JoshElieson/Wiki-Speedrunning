import { DifficultyBadge } from "@/components/presentation/difficulty-badge";
import { RoutePathChips } from "@/components/presentation/route-path-chips";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ChallengeDescriptor } from "@/types/domain";

export function ChallengeCard({ challenge, compact = false }: { challenge: ChallengeDescriptor; compact?: boolean }) {
  return (
    <Card className={compact ? "p-4" : "p-6"} interactive>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="neutral">{challenge.source === "daily" ? "Daily Seed" : "Generated"}</Badge>
        <DifficultyBadge tier={challenge.difficultyTier} score={challenge.difficultyScore} />
        {challenge.shortestPathHint ? <Badge variant="purple">Hint {challenge.shortestPathHint} hops</Badge> : null}
      </div>

      <h3 className="mt-4 text-xl font-semibold tracking-tight text-[var(--foreground)]">{challenge.label}</h3>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Race from <span className="font-medium text-[var(--foreground)]">{challenge.startTitle}</span> to{" "}
        <span className="font-medium text-[var(--foreground)]">{challenge.targetTitle}</span>.
      </p>

      <div className="mt-4">
        <RoutePathChips path={[challenge.startTitle, "…", challenge.targetTitle]} />
      </div>
    </Card>
  );
}
