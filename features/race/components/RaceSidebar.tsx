"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RouteTrail } from "./RouteTrail";
import type { ChallengeDescriptor } from "@/types/domain";
import type { RaceStatus, RouteNode } from "../types/race-state";

interface RaceSidebarProps {
  challenge: ChallengeDescriptor | null;
  status: RaceStatus;
  clickCount: number;
  remainingHint: number | null;
  route: RouteNode[];
  onAbandon: () => void;
  onRestart: () => void;
  onNewChallenge: () => void;
}

export function RaceSidebar({
  challenge,
  status,
  clickCount,
  remainingHint,
  route,
  onAbandon,
  onRestart,
  onNewChallenge,
}: RaceSidebarProps) {
  return (
    <aside className="space-y-4">
      <Card className="p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Target</p>
        <h3 className="mt-1 text-xl font-semibold text-[var(--foreground)]">{challenge?.targetTitle ?? "--"}</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge>{challenge?.difficultyTier ?? "unrated"}</Badge>
          <Badge className="border-[#8f7d66]/40 bg-[#f3ede3] text-[#5b4a38]">
            Difficulty {challenge?.difficultyScore ?? "--"}
          </Badge>
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Run Stats</p>
        <div className="mt-3 space-y-1 text-sm text-[var(--muted)]">
          <p>Clicks: {clickCount}</p>
          <p>Hinted steps left: {remainingHint ?? "--"}</p>
          <p>Status: {status}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onAbandon} disabled={status !== "active"}>
            Abandon
          </Button>
          <Button size="sm" onClick={onRestart} disabled={!challenge}>
            Restart
          </Button>
          <Button variant="ghost" size="sm" onClick={onNewChallenge}>
            New challenge
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Route Trail</p>
        <div className="mt-3">
          <RouteTrail route={route} />
        </div>
      </Card>
    </aside>
  );
}
