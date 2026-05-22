"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArticlePanel } from "./ArticlePanel";
import { RaceHeader } from "./RaceHeader";
import { RaceResult } from "./RaceResult";
import { RaceSidebar } from "./RaceSidebar";
import { useRaceController } from "../hooks/useRaceController";

export function RaceShell() {
  const {
    race,
    elapsedMs,
    invalidMoveTitle,
    pendingMoveTitle,
    challengeQuery,
    articleQuery,
    runSubmissionMutation,
    isArticleTransitioning,
    startRace,
    navigateToLink,
    restartRace,
    loadFreshChallenge,
    abandonRace,
  } = useRaceController();

  const remainingHint = race.challenge?.shortestPathHint != null ? Math.max(race.challenge.shortestPathHint - race.clickCount, 0) : null;
  const showIdle = race.status === "idle";

  if (race.status === "error" && !race.challenge) {
    return (
      <Card className="space-y-4 border-[#b77c70]/50 bg-[#f8ece9] p-6">
        <div>
          <h2 className="text-xl font-semibold text-[#7a3125]">Race failed to initialize</h2>
          <p className="mt-1 text-sm text-[#8f4538]">{race.error ?? "Unable to initialize a race challenge."}</p>
        </div>
        <Button onClick={startRace}>Retry</Button>
      </Card>
    );
  }

  if (!race.challenge && showIdle) {
    return (
      <section className="space-y-4">
        <RaceHeader
          status={race.status}
          elapsedMs={elapsedMs}
          currentArticleTitle={race.currentArticle?.title ?? null}
          targetArticleTitle={race.targetArticle?.title ?? null}
          onStart={startRace}
          startDisabled={challengeQuery.isFetching}
        />
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Ready to speedrun?</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Click <span className="font-medium">Start Race</span> to draw a challenge and begin navigating only through valid
            in-article links.
          </p>
        </Card>
      </section>
    );
  }

  if (!race.challenge && race.status === "loading") {
    return (
      <section className="space-y-4">
        <RaceHeader
          status={race.status}
          elapsedMs={elapsedMs}
          currentArticleTitle={race.currentArticle?.title ?? null}
          targetArticleTitle={race.targetArticle?.title ?? null}
          onStart={startRace}
          startDisabled
        />
        <Card className="p-6">
          <div className="space-y-3">
            <div className="h-5 w-48 animate-pulse rounded bg-[#ddd7ca]" />
            <div className="h-4 w-full animate-pulse rounded bg-[#ddd7ca]" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-[#ddd7ca]" />
          </div>
        </Card>
      </section>
    );
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
        <section className="space-y-4">
          {race.status === "error" ? (
            <Card className="border-[#c9a063]/50 bg-[#f8f1e2] p-4 text-sm text-[#6a4e1f]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p>{race.error ?? "A race error occurred."}</p>
                <Button size="sm" variant="outline" onClick={loadFreshChallenge}>
                  Recover
                </Button>
              </div>
            </Card>
          ) : null}

          <RaceHeader
            status={race.status}
            elapsedMs={elapsedMs}
            currentArticleTitle={race.currentArticle?.title ?? null}
            targetArticleTitle={race.targetArticle?.title ?? null}
            onStart={startRace}
            startDisabled={race.status === "active" || challengeQuery.isFetching}
          />

          <ArticlePanel
            article={articleQuery.data}
            isLoading={isArticleTransitioning || race.status === "loading"}
            isActiveRace={race.status === "active"}
            invalidMoveTitle={invalidMoveTitle}
            pendingMoveTitle={pendingMoveTitle}
            onLinkClick={navigateToLink}
          />
        </section>

        <RaceSidebar
          challenge={race.challenge}
          status={race.status}
          clickCount={race.clickCount}
          remainingHint={remainingHint}
          route={race.route}
          onAbandon={abandonRace}
          onRestart={restartRace}
          onNewChallenge={loadFreshChallenge}
        />
      </div>

      {race.challenge ? (
        <RaceResult
          open={race.status === "completed"}
          challenge={race.challenge}
          elapsedMs={elapsedMs}
          clickCount={race.clickCount}
          submittedRun={runSubmissionMutation.data}
          isSubmitting={runSubmissionMutation.isPending}
          submitError={runSubmissionMutation.error instanceof Error ? runSubmissionMutation.error.message : null}
          onRaceAgain={loadFreshChallenge}
        />
      ) : null}
    </>
  );
}
