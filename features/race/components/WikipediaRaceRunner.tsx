"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchArticle, normalizeTitle, titleEquals } from "@/features/wiki/services/wikiApi";
import { formatDuration } from "@/utils/format";
import { RaceHud } from "./RaceHud";
import { WikipediaArticleView } from "./WikipediaArticleView";
import { useRaceTimer } from "../hooks/useRaceTimer";
import { fetchRandomChallenge, submitRun } from "../services/race-api";
import type { RunSubmissionRequest } from "@/server/types/api";
import type { RunDetail } from "@/server/types/run-history";
import type { ChallengeDescriptor } from "@/types/domain";

type RaceStatus = "loading" | "countdown" | "active" | "completed" | "abandoned" | "error";

interface RouteEntry {
  title: string;
  visitedAtOffsetMs: number;
}

interface WikipediaRaceRunnerProps {
  onReturnToSelection: () => void;
}

function isRateLimitedError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /\b429\b|rate limit/i.test(error.message);
}

const EMERGENCY_CHALLENGE_SEED = {
  startTitle: "Mars",
  targetTitle: "TypeScript",
  id: "generated-emergency-mars-typescript",
};

function safeTitleParam(raw: string | null): string | null {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildFallbackChallenge(startTitle: string, targetTitle: string): ChallengeDescriptor {
  const normalizedStart = normalizeTitle(startTitle);
  const normalizedTarget = normalizeTitle(targetTitle);
  return {
    id: `custom-${normalizedStart}--${normalizedTarget}`,
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
  const [savedRun, setSavedRun] = useState<RunDetail | null>(null);
  const [countdownValue, setCountdownValue] = useState<number | "GO" | null>(null);

  const randomChallengeQuery = useQuery({
    queryKey: ["race", "random-challenge"],
    queryFn: fetchRandomChallenge,
    enabled: !startFromUrl || !targetFromUrl,
    retry: (failureCount, error) => {
      if (isRateLimitedError(error)) {
        return failureCount < 5;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex, error) => {
      if (isRateLimitedError(error)) {
        return Math.min(1000 * 2 ** attemptIndex, 8000);
      }
      return 700;
    },
  });

  const articleQuery = useQuery({
    queryKey: ["wiki", "article", normalizeTitle(currentTitle)],
    queryFn: () => fetchArticle(currentTitle),
    enabled: Boolean(currentTitle),
    retry: (failureCount, error) => {
      if (isRateLimitedError(error)) {
        return failureCount < 5;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex, error) => {
      if (isRateLimitedError(error)) {
        return Math.min(1000 * 2 ** attemptIndex, 8000);
      }
      return 600;
    },
  });

  const runSubmissionMutation = useMutation({
    mutationFn: (payload: RunSubmissionRequest) => submitRun(payload),
  });

  const isArticleLoading = articleQuery.isPending || articleQuery.isFetching;
  const isInteractionBlocked = isArticleLoading || status !== "active";
  const isRaceActive = status === "active";
  const isPreStartOverlayVisible = status === "loading" || status === "countdown";

  const returnToSelection = useCallback(() => {
    isLeavingRaceRef.current = true;
    stopTimer();
    router.replace("/race", { scroll: false });
    onReturnToSelection();
  }, [onReturnToSelection, router, stopTimer]);

  const startGoalPair = useMemo(() => {
    if (startFromUrl && targetFromUrl) {
      const fetchedChallenge = randomChallengeQuery.data;
      if (
        fetchedChallenge &&
        titleEquals(fetchedChallenge.startTitle, startFromUrl) &&
        titleEquals(fetchedChallenge.targetTitle, targetFromUrl)
      ) {
        return {
          start: fetchedChallenge.startTitle,
          target: fetchedChallenge.targetTitle,
          challenge: fetchedChallenge,
        };
      }

      return {
        start: startFromUrl,
        target: targetFromUrl,
        challenge: buildFallbackChallenge(startFromUrl, targetFromUrl),
      };
    }

    if (!randomChallengeQuery.data) {
      if (randomChallengeQuery.isError) {
        return {
          start: EMERGENCY_CHALLENGE_SEED.startTitle,
          target: EMERGENCY_CHALLENGE_SEED.targetTitle,
          challenge: {
            ...buildFallbackChallenge(EMERGENCY_CHALLENGE_SEED.startTitle, EMERGENCY_CHALLENGE_SEED.targetTitle),
            id: EMERGENCY_CHALLENGE_SEED.id,
            label: "Emergency fallback race",
          },
        };
      }

      return null;
    }

    return {
      start: randomChallengeQuery.data.startTitle,
      target: randomChallengeQuery.data.targetTitle,
      challenge: randomChallengeQuery.data,
    };
  }, [randomChallengeQuery.data, randomChallengeQuery.isError, startFromUrl, targetFromUrl]);

  useEffect(() => {
    if (!startGoalPair || isLeavingRaceRef.current) {
      if (randomChallengeQuery.isError && !isLeavingRaceRef.current && !randomChallengeQuery.data) {
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
    setStatus("loading");
    setLastError(null);
    setSavedRun(null);
    setCountdownValue(null);
    resetTimer();
  }, [resetTimer, startGoalPair, randomChallengeQuery.data, randomChallengeQuery.isError]);

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

    const message = isRateLimitedError(articleQuery.error)
      ? "Wikipedia is rate-limiting requests right now. Please wait a moment and try again."
      : articleQuery.error instanceof Error
        ? articleQuery.error.message
        : "Could not load article.";
    setLastError(message);
    if (status === "loading") {
      setStatus("error");
    }
  }, [articleQuery.error, status]);

  useEffect(() => {
    if (status !== "loading") {
      return;
    }

    if (isArticleLoading || !articleQuery.data || lastError) {
      return;
    }

    setStatus("countdown");
  }, [articleQuery.data, isArticleLoading, lastError, status]);

  useEffect(() => {
    if (status !== "countdown") {
      return;
    }

    setCountdownValue(3);
    const countdownTimers = [
      window.setTimeout(() => setCountdownValue(2), 1000),
      window.setTimeout(() => setCountdownValue(1), 2000),
      window.setTimeout(() => setCountdownValue("GO"), 3000),
      window.setTimeout(() => {
        setCountdownValue(null);
        setStatus("active");
        startTimer();
      }, 4000),
    ];

    return () => {
      countdownTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [startTimer, status]);

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
      onSuccess: (persistedRun) => {
        setSavedRun(persistedRun);
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

      runSubmissionMutation.mutate(payload, {
        onSuccess: (persistedRun) => {
          setSavedRun(persistedRun);
        },
        onError: () => {
          setLastError("Run abandoned, but saving failed. You can return to race modes and try again.");
        },
        onSettled: () => {
          returnToSelection();
        },
      });
      return;
    }

    returnToSelection();
  }, [challenge, clickCount, elapsedMs, returnToSelection, route, runSubmissionMutation, startTitle, status, stopTimer, targetTitle]);

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

      {isPreStartOverlayVisible ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101418]/80 px-4">
          <Card className="w-full max-w-xl border-[#2a3b47] bg-[#101418] p-6 text-[#f8fbff] shadow-2xl">
            <p className="text-xs uppercase tracking-[0.2em] text-[#7aa6c2]">Wikipedia Run</p>
            <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Get ready</h2>
            <div className="mt-5 grid gap-3 text-left sm:grid-cols-2">
              <div className="rounded-md border border-[#2a3b47] bg-[#16222b] p-3">
                <p className="text-xs uppercase tracking-wide text-[#9fc4d9]">Start</p>
                <p className="mt-1 text-base font-semibold text-white">{startTitle}</p>
              </div>
              <div className="rounded-md border border-[#2a3b47] bg-[#16222b] p-3">
                <p className="text-xs uppercase tracking-wide text-[#9fc4d9]">Goal</p>
                <p className="mt-1 text-base font-semibold text-white">{targetTitle}</p>
              </div>
            </div>
            <div className="mt-6 text-center">
              {status === "loading" ? (
                <p className="text-sm text-[#d6e7f2]">Loading the start page...</p>
              ) : (
                <>
                  <p className="text-sm text-[#d6e7f2]">Race begins in</p>
                  <p className="mt-1 text-5xl font-bold leading-none text-white">{countdownValue}</p>
                </>
              )}
            </div>
          </Card>
        </div>
      ) : null}

      {status === "completed" || status === "abandoned" ? (
        <div className="w-full px-2 sm:px-3">
          <Card className="mt-4 border-[#a2a9b1] bg-[#f8f9fa] p-4 text-sm text-[#202122]">
            <p className="font-medium">
              {status === "completed" ? "Run complete." : "Run abandoned."}{" "}
              {runSubmissionMutation.isPending
                ? "Saving your result..."
                : runSubmissionMutation.isError
                  ? "We could not save this run."
                  : "Your run has been recorded."}
            </p>
            <p className="mt-1 text-xs text-[#54595d]">
              Time: {formatDuration(elapsedMs)} | Clicks: {clickCount} | ELO:{" "}
              {savedRun ? `${savedRun.eloDelta > 0 ? "+" : ""}${savedRun.eloDelta}` : runSubmissionMutation.isPending ? "calculating..." : "unavailable"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {savedRun ? (
                <Button size="sm" onClick={() => router.push(`/runs/${savedRun.id}`)}>
                  View Route Path
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
