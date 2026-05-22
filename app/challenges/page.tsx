"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ChallengeCard } from "@/components/presentation/challenge-card";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/presentation/state-panel";
import type { ChallengeDescriptor } from "@/types/domain";

export default function ChallengesPage() {
  const query = useQuery({
    queryKey: ["challenge", "next"],
    queryFn: async () => {
      const response = await fetch("/api/challenges/next");
      if (!response.ok) throw new Error("Failed to load challenge");
      return (await response.json()) as ChallengeDescriptor;
    },
  });

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34 }}>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">Challenge Browser</h1>
        <p className="mt-2 text-[var(--muted)]">Explore generated challenge queues organized by graph complexity and route pressure.</p>
      </motion.div>

      <div className="mt-6">
        {query.isLoading ? <LoadingPanel title="Preparing generated challenge" /> : null}
        {query.isError ? <ErrorPanel message="Challenge generator unavailable right now." /> : null}
        {query.data ? <ChallengeCard challenge={query.data} /> : null}
        {!query.isLoading && !query.isError && !query.data ? (
          <EmptyPanel title="No generated challenge" message="Try again to fetch a new challenge seed." />
        ) : null}
      </div>
    </main>
  );
}
