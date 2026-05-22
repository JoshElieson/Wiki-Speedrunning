"use client";

import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ResultSummaryCard } from "@/components/presentation/result-summary-card";
import { RoutePathGraph } from "@/components/presentation/route-path-graph";
import { StatCard } from "@/components/presentation/stat-card";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/presentation/state-panel";
import { fetchRunById } from "@/features/race/services/race-api";
import { formatDuration } from "@/utils/format";

function formatRunStatus(status: "COMPLETED" | "ABANDONED" | "DISQUALIFIED") {
  if (status === "ABANDONED") {
    return "Abandoned";
  }
  if (status === "DISQUALIFIED") {
    return "Disqualified";
  }
  return "Completed";
}

function formatEloDelta(delta: number) {
  return `${delta > 0 ? "+" : ""}${delta}`;
}

export default function RunResultPage() {
  const params = useParams<{ id: string }>();
  const runQuery = useQuery({
    queryKey: ["run", params.id],
    queryFn: () => fetchRunById(params.id),
  });
  const run = runQuery.data;
  const routeLength = run?.routePath.nodes.length ?? run?.steps.length ?? run?.route.length ?? 0;

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
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Time" value={formatDuration(run.finalElapsedMs)} hint={`${routeLength} route nodes`} delay={0.03} />
            <StatCard label="Clicks" value={`${run.clickCount}`} hint={`Final score ${run.score}`} delay={0.06} />
            <StatCard label="Date" value={new Date(run.completedAt).toLocaleDateString()} hint={new Date(run.completedAt).toLocaleTimeString()} delay={0.09} />
            <StatCard
              label="ELO Change"
              value={formatEloDelta(run.eloDelta)}
              hint={run.eloDelta < 0 ? "Penalty applied" : run.eloDelta > 0 ? "Rating gain applied" : "No rating change"}
              delay={0.12}
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <StatCard label="Challenge" value={run.challengeLabel} hint={`${run.startArticleTitle} to ${run.targetArticleTitle}`} delay={0.06} />
            <StatCard label="Route Length" value={`${routeLength} nodes`} hint="Recorded traversal" delay={0.12} />
            <StatCard
              label="Status"
              value={formatRunStatus(run.status)}
              hint={new Date(run.completedAt).toLocaleString()}
              delay={0.18}
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_1.4fr]">
            <ResultSummaryCard durationMs={run.finalElapsedMs} clickCount={run.clickCount} score={run.score} routeLength={routeLength} />
            {run.steps.length > 0 ? (
              <RoutePathGraph steps={run.steps} status={run.status} />
            ) : (
              <EmptyPanel title="Route Path unavailable" message="No step data was recorded for this run." />
            )}
          </div>
        </>
      ) : null}
    </main>
  );
}
