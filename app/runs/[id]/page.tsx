"use client";

import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { ResultSummaryCard } from "@/components/presentation/result-summary-card";
import { RoutePathChips } from "@/components/presentation/route-path-chips";
import { StatCard } from "@/components/presentation/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function getMockRun(id: string) {
  return {
    id,
    challengeLabel: "Culture Shift",
    durationMs: 60992,
    clickCount: 13,
    score: 1912,
    route: ["Jazz", "Improvisation", "Computer science", "Machine learning"],
    shortestPathHint: 3,
  };
}

export default function RunResultPage() {
  const params = useParams<{ id: string }>();
  const run = getMockRun(params.id);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">Run Result</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Run ID: {run.id}</p>
      </motion.div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Challenge" value={run.challengeLabel} hint="Seeded match" delay={0.06} />
        <StatCard label="Route Length" value={`${run.route.length} nodes`} hint="Recorded traversal" delay={0.12} />
        <StatCard label="Shortest Hint" value={`${run.shortestPathHint} hops`} hint="Estimated optimal path" delay={0.18} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_1.4fr]">
        <ResultSummaryCard durationMs={run.durationMs} clickCount={run.clickCount} score={run.score} routeLength={run.route.length} />

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Route Timeline</h2>
            <Badge variant="neutral">Replay-ready</Badge>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">This visualization scaffolds the run path layer and spectator playback entry point.</p>
          <div className="mt-4">
            <RoutePathChips path={run.route} />
          </div>
        </Card>
      </div>
    </main>
  );
}
