"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchArticle, normalizeTitle, titleEquals } from "@/features/wiki/services/wikiApi";
import { RaceHud } from "./RaceHud";
import { WikipediaArticleView } from "./WikipediaArticleView";
import { useRaceTimer } from "../hooks/useRaceTimer";
import { fetchRandomChallenge, submitRun } from "../services/race-api";
import type { RunSubmissionRequest } from "@/server/types/api";
import type { ChallengeDescriptor } from "@/types/domain";

type RaceStatus = "loading" | "active" | "completed" | "abandoned" | "error";

interface RouteEntry {
  title: string;
  visitedAtOffsetMs: number;
}

interface WikipediaRaceRunnerProps {
  onReturnToSelection: () => void;
}

function safeTitleParam(raw: string | null): string | null {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildFallbackChallenge(startTitle: string, targetTitle: string): ChallengeDescriptor {
  return {
    id: `custom-${Date.now().toString(36)}`,
    label: "Custom race",
    startTitle,
    targetTitle,
    difficultyScore: 60,
    difficultyTier: "intermediate",
    source: "generated",
  };
}

export function WikipediaRaceRunner({ onReturnToSelection }: WikipediaRaceRunnerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { elapsedMs, start: startTimer, stop: stopTimer, reset: resetTimer } = useRaceTimer();
  const runSubmittedRef = useRef(false);
  const raceInitKeyRef = useRef<string | null>(null);
  const isLeavingRaceRef = useRef(false);

  const startFromUrl = safeTitleParam(searchParams.get("start"));
  const targetFromUrl = safeTitleParam(searchParams.get("target"));

  const [status, setStatus] = useState<RaceStatus>("loading");
  const [currentTitle, setCurrentTitle] = useState<string>("");
  const [startTitle, setStartTitle] = useState<string>("");
  const [targetTitle, setTargetTitle] = useState<string>("");
  const [clickCount, setClickCount] = useState(0);
  const [route, setRoute] = useState<RouteEntry[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<ChallengeDescriptor | null>(null);
  const [savedRunId, setSavedRunId] = useState<string | null>(null);

  const randomChallengeQuery = useQuery({
    queryKey: ["race", "random-challenge"],
    queryFn: fetchRandomChallenge,
    enabled: !startFromUrl || !targetFromUrl,
    retry: 1,
  });

  const articleQuery = useQuery({
    queryKey: ["wiki", "article", normalizeTitle(currentTitle)],
    queryFn: () => fetchArticle(currentTitle),
    enabled: Boolean(currentTitle),
    retry: 1,
  });

  const runSubmissionMutation = useMutation({
    mutationFn: (payload: RunSubmissionRequest) => submitRun(payload),
  });

  const isArticleLoading = articleQuery.isPending || articleQuery.isFetching;
  const isInteractionBlocked = isArticleLoading || status !== "active";
  const isRaceActive = status === "active";

  const returnToSelection = useCallback(() => {
    isLeavingRaceRef.current = true;
    stopTimer();
    router.replace("/race", { scroll: false });
    onReturnToSelection();
  }, [onReturnToSelection, router, stopTimer]);

  const startGoalPair = useMemo(() => {
    if (startFromUrl && targetFromUrl) {
      return {
        start: startFromUrl,
        target: targetFromUrl,
        challenge: buildFallbackChallenge(startFromUrl, targetFromUrl),
      };
    }

    if (!randomChallengeQuery.data) {
      return null;
    }

    return {
      start: randomChallengeQuery.data.startTitle,
      target: randomChallengeQuery.data.targetTitle,
      challenge: randomChallengeQuery.data,
    };
  }, [randomChallengeQuery.data, startFromUrl, targetFromUrl]);

  useEffect(() => {
    if (!startGoalPair || isLeavingRaceRef.current) {
      if (randomChallengeQuery.isError && !isLeavingRaceRef.current) {
        setStatus("error");
        setLastError("Could not load a race challenge.");
      }
      return;
    }

    const initKey = `${startGoalPair.challenge.id}:${startGoalPair.start}:${startGoalPair.target}`;
    if (raceInitKeyRef.current === initKey) {
      return;
    }

    raceInitKeyRef.current = initKey;
    runSubmittedRef.current = false;
    const normalizedStart = normalizeTitle(startGoalPair.start).replace(/_/g, " ");
    const normalizedTarget = normalizeTitle(startGoalPair.target).replace(/_/g, " ");

    setChallenge(startGoalPair.challenge);
    setStartTitle(normalizedStart);
    setTargetTitle(normalizedTarget);
    setCurrentTitle(normalizedStart);
    setClickCount(0);
    setRoute([{ title: normalizedStart, visitedAtOffsetMs: 0 }]);
    setStatus("active");
    setLastError(null);
    setSavedRunId(null);
    resetTimer();
    startTimer();
  }, [resetTimer, startGoalPair, startTimer, randomChallengeQuery.isError]);

  useEffect(() => {
    if (isLeavingRaceRef.current || !currentTitle || !startTitle || !targetTitle) {
      return;
    }

    if (
      searchParams.get("start") === startTitle &&
      searchParams.get("target") === targetTitle &&
      searchParams.get("article") === currentTitle
    ) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("start", startTitle);
    nextParams.set("target", targetTitle);
    nextParams.set("article", currentTitle);
    router.replace(`/race?${nextParams.toString()}`, { scroll: false });
  }, [currentTitle, router, searchParams, startTitle, targetTitle]);

  useEffect(() => {
    if (!articleQuery.error) {
      return;
    }

    const message = articleQuery.error instanceof Error ? articleQuery.error.message : "Could not load article.";
    setLastError(message);
  }, [articleQuery.error]);

  useEffect(() => {
    if (status !== "active") {
      return;
    }

    if (!titleEquals(currentTitle, targetTitle)) {
      return;
    }

    if (runSubmittedRef.current || !challenge) {
      return;
    }

    runSubmittedRef.current = true;
    stopTimer();
    setStatus("completed");

    const payload: RunSubmissionRequest = {
      challengeId: challenge.id,
      completed: true,
      durationMs: elapsedMs,
      clickCount,
      route: route.map((step) => step.title),
      steps: route.slice(1).map((step, index) => ({
        fromTitle: route[index].title,
        toTitle: step.title,
        clickedAtOffsetMs: step.visitedAtOffsetMs,
      })),
      challengeSnapshot: {
        label: challenge.label,
        startTitle,
        targetTitle,
        difficultyScore: challenge.difficultyScore,
      },
    };

    runSubmissionMutation.mutate(payload, {
      onSuccess: (savedRun) => {
        setSavedRunId(savedRun.id);
      },
      onError: () => {
        setLastError("Run finished, but saving failed. You can retry from the race page.");
      },
    });
  }, [challenge, clickCount, currentTitle, elapsedMs, route, runSubmissionMutation, startTitle, status, stopTimer, targetTitle]);

  const handleAbandon = useCallback(() => {
    if (status !== "active" || isLeavingRaceRef.current) {
      return;
    }

    isLeavingRaceRef.current = true;
    runSubmittedRef.current = true;
    stopTimer();
    setStatus("abandoned");

    if (challenge) {
      const payload: RunSubmissionRequest = {
        challengeId: challenge.id,
        completed: false,
        durationMs: elapsedMs,
        clickCount,
        route: route.map((step) => step.title),
        steps: route.slice(1).map((step, index) => ({
          fromTitle: route[index].title,
          toTitle: step.title,
          clickedAtOffsetMs: step.visitedAtOffsetMs,
        })),
        challengeSnapshot: {
          label: challenge.label,
          startTitle,
          targetTitle,
          difficultyScore: challenge.difficultyScore,
        },
      };

      void runSubmissionMutation.mutate(payload);
    }

    router.replace("/race", { scroll: false });
    onReturnToSelection();
  }, [challenge, clickCount, elapsedMs, onReturnToSelection, route, router, runSubmissionMutation, startTitle, status, stopTimer, targetTitle]);

  useEffect(() => {
    if (status !== "active") {
      return;
    }

    const onKeydown = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }

      const blocked = ["l", "k", "f"];
      if (blocked.includes(event.key.toLowerCase())) {
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [status]);

  if (status === "error") {
    return (
      <Card className="mx-auto mt-8 w-full max-w-5xl border-[#b77c70]/50 bg-[#f8ece9] p-6">
        <h2 className="text-xl font-semibold text-[#7a3125]">Race failed to initialize</h2>
        <p className="mt-1 text-sm text-[#8f4538]">{lastError ?? "Please reload and try again."}</p>
        <div className="mt-4">
          <Button variant="outline" onClick={returnToSelection}>
            Back to Race Modes
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <section className="relative min-h-[calc(100vh-4rem)] bg-white pb-8">
      {isRaceActive ? (
        <RaceHud
          elapsedMs={elapsedMs}
          clickCount={clickCount}
          startTitle={startTitle}
          targetTitle={targetTitle}
          onAbandon={handleAbandon}
        />
      ) : null}

      <div className="w-full px-2 py-4 sm:px-3 sm:py-5">
        <WikipediaArticleView
          title={articleQuery.data?.title ?? currentTitle}
          displayTitle={articleQuery.data?.displayTitle ?? articleQuery.data?.title ?? currentTitle}
          html={articleQuery.data?.html ?? ""}
          isLoading={isArticleLoading}
          errorMessage={lastError}
          disableInteraction={isInteractionBlocked}
          onInternalLinkClick={(nextTitle) => {
            if (isInteractionBlocked || !nextTitle) {
              return;
            }

            setLastError(null);
            setClickCount((value) => value + 1);
            setCurrentTitle(nextTitle);
            setRoute((previous) => [...previous, { title: nextTitle, visitedAtOffsetMs: elapsedMs }]);
          }}
        />
      </div>

      {status === "completed" ? (
        <div className="w-full px-2 sm:px-3">
          <Card className="mt-4 border-[#a2a9b1] bg-[#f8f9fa] p-4 text-sm text-[#202122]">
            <p>
              {runSubmissionMutation.isPending
                ? "Run complete. Saving your result..."
                : "Run complete. Choose what to do next."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {savedRunId ? (
                <Button size="sm" onClick={() => router.push(`/runs/${savedRunId}`)}>
                  View Result
                </Button>
              ) : null}
              <Button size="sm" variant="outline" onClick={returnToSelection}>
                Back to Race Modes
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
