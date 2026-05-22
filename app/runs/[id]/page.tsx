"use client";

import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ResultSummaryCard } from "@/components/presentation/result-summary-card";
import { RoutePathChips } from "@/components/presentation/route-path-chips";
import { StatCard } from "@/components/presentation/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorPanel, LoadingPanel } from "@/components/presentation/state-panel";
import { fetchRunById } from "@/features/race/services/race-api";
import { formatDuration } from "@/utils/format";

export default function RunResultPage() {
  const params = useParams<{ id: string }>();
  const runQuery = useQuery({
    queryKey: ["run", params.id],
    queryFn: () => fetchRunById(params.id),
  });
  const run = runQuery.data;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">Run Result</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Run ID: {params.id}</p>
      </motion.div>

      {runQuery.isLoading ? <LoadingPanel title="Loading run details" /> : null}
      {runQuery.isError ? <ErrorPanel message="Could not load this run." /> : null}

      {run ? (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <StatCard label="Challenge" value={run.challengeLabel} hint={`${run.startArticleTitle} to ${run.targetArticleTitle}`} delay={0.06} />
            <StatCard label="Route Length" value={`${run.route.length} nodes`} hint="Recorded traversal" delay={0.12} />
            <StatCard
              label="Status"
              value={run.status === "ABANDONED" ? "Abandoned" : run.status === "DISQUALIFIED" ? "Disqualified" : "Completed"}
              hint={new Date(run.completedAt).toLocaleString()}
              delay={0.18}
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_1.4fr]">
            <ResultSummaryCard durationMs={run.finalElapsedMs} clickCount={run.clickCount} score={run.score} routeLength={run.route.length} />

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--foreground)]">Route Timeline</h2>
                <Badge variant="neutral">Replay-ready</Badge>
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">Each step stores elapsed timing for future ghost race playback.</p>
              <div className="mt-4">
                <RoutePathChips path={run.route} />
              </div>
              <div className="mt-4 space-y-2">
                {run.steps.map((step) => (
                  <div key={`${step.stepIndex}-${step.articleTitle}`} className="text-sm text-[var(--muted)]">
                    {step.stepIndex}. {step.articleTitle} - {formatDuration(step.elapsedMs)}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </main>
  );
}
