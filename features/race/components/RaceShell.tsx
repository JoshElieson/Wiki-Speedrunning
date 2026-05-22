"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArticlePanel } from "./ArticlePanel";
import { CompletionModal } from "./CompletionModal";
import { RaceSidebar } from "./RaceSidebar";
import { RaceTimer } from "./RaceTimer";
import { useRaceController } from "../hooks/useRaceController";

export function RaceShell() {
  const {
    race,
    elapsedMs,
    invalidMoveTitle,
    challengeQuery,
    articleQuery,
    runSubmissionMutation,
    isArticleTransitioning,
    navigateToLink,
    restartRace,
    loadFreshChallenge,
    abandonRace,
  } = useRaceController();

  const remainingHint = race.challenge?.shortestPathHint != null ? Math.max(race.challenge.shortestPathHint - race.clickCount, 0) : null;
  const statusLabel = race.status === "active" ? "Live" : race.status;

  if (challengeQuery.isPending && !race.challenge) {
    return (
      <Card className="p-6">
        <div className="space-y-3">
          <div className="h-5 w-48 animate-pulse rounded bg-[#ddd7ca]" />
          <div className="h-4 w-full animate-pulse rounded bg-[#ddd7ca]" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-[#ddd7ca]" />
        </div>
      </Card>
    );
  }

  if ((race.status === "error" || challengeQuery.isError) && !race.challenge) {
    return (
      <Card className="space-y-4 border-[#b77c70]/50 bg-[#f8ece9] p-6">
        <div>
          <h2 className="text-xl font-semibold text-[#7a3125]">Race failed to initialize</h2>
          <p className="mt-1 text-sm text-[#8f4538]">{race.errorMessage ?? "Unable to initialize a race challenge."}</p>
        </div>
        <Button onClick={loadFreshChallenge}>Retry</Button>
      </Card>
    );
  }

  if (!race.challenge) {
    return (
      <Card className="space-y-4 p-6">
        <p className="text-[var(--muted)]">No challenge available right now.</p>
        <Button onClick={loadFreshChallenge}>Load challenge</Button>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
        <section className="space-y-4">
          {race.status === "error" ? (
            <Card className="border-[#c9a063]/50 bg-[#f8f1e2] p-4 text-sm text-[#6a4e1f]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p>{race.errorMessage ?? "A race error occurred."}</p>
                <Button size="sm" variant="outline" onClick={loadFreshChallenge}>
                  Recover
                </Button>
              </div>
            </Card>
          ) : null}

          <Card className="relative overflow-hidden p-5">
            <div className="relative flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Current Article</p>
                <motion.h2
                  key={race.currentArticleTitle}
                  initial={{ opacity: 0.8, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl font-semibold text-[var(--foreground)]"
                >
                  {race.currentArticleTitle}
                </motion.h2>
                <p className="mt-1 text-xs text-[var(--muted)]">Goal: {race.targetArticleTitle}</p>
              </div>
              <RaceTimer elapsedMs={elapsedMs} statusLabel={statusLabel} />
            </div>
          </Card>

          <ArticlePanel
            article={articleQuery.data}
            isLoading={isArticleTransitioning}
            isActiveRace={race.status === "active"}
            invalidMoveTitle={invalidMoveTitle}
            onLinkClick={navigateToLink}
          />
        </section>

        <RaceSidebar
          challenge={race.challenge}
          status={race.status}
          clickCount={race.clickCount}
          remainingHint={remainingHint}
          routeHistory={race.routeHistory}
          onAbandon={abandonRace}
          onRestart={restartRace}
          onNewChallenge={loadFreshChallenge}
        />
      </div>

      <CompletionModal
        open={race.status === "completed"}
        challenge={race.challenge}
        elapsedMs={elapsedMs}
        clickCount={race.clickCount}
        routeHistory={race.routeHistory}
        submittedRun={runSubmissionMutation.data}
        isSubmitting={runSubmissionMutation.isPending}
        submitError={runSubmissionMutation.error instanceof Error ? runSubmissionMutation.error.message : null}
        onReplay={restartRace}
        onNewChallenge={loadFreshChallenge}
      />
    </>
  );
}
