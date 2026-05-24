"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getWikiMode, type WikiModeId } from "@/lib/wiki-modes";
import {
  fetchArticle,
  normalizeTitle,
  reachedRaceTarget,
  titleEquals,
  wikiArticleQueryKey,
  WIKI_ARTICLE_STALE_TIME_MS,
} from "@/features/wiki/services/wikiApi";
import { RaceHud } from "./RaceHud";
import { CompletionModal } from "./CompletionModal";
import { WikipediaArticleView } from "./WikipediaArticleView";
import { useRaceTimer } from "../hooks/useRaceTimer";
import { fetchRandomChallenge, submitRun } from "../services/race-api";
import type { RunSubmissionRequest } from "@/server/types/api";
import type { RunDetail } from "@/server/types/run-history";
import type { ChallengeDescriptor } from "@/types/domain";

type RaceStatus = "loading" | "countdown" | "active" | "completed" | "abandoned" | "error";

interface RouteEntry {
  title: string;
  articleUrl?: string;
  visitedAtOffsetMs: number;
  visitedAtIso: string;
  clickIndex: number;
}

interface WikipediaRaceRunnerProps {
  modeId: WikiModeId;
  onReturnToSelection: () => void;
}

function isRateLimitedError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /\b429\b|rate limit/i.test(error.message);
}

function safeTitleParam(raw: string | null): string | null {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildFallbackChallenge(startTitle: string, targetTitle: string, modeId: WikiModeId): ChallengeDescriptor {
  const wikiMode = getWikiMode(modeId);
  const normalizedStart = normalizeTitle(startTitle, modeId);
  const normalizedTarget = normalizeTitle(targetTitle, modeId);
  return {
    id: `custom-${normalizedStart}--${normalizedTarget}`,
    label: wikiMode.fallbackChallengeLabel,
    startTitle,
    targetTitle,
    difficultyScore: 60,
    difficultyTier: "intermediate",
    source: "generated",
  };
}

export function WikipediaRaceRunner({ modeId, onReturnToSelection }: WikipediaRaceRunnerProps) {
  const wikiMode = getWikiMode(modeId);
  const { data: session, status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated" && Boolean(session?.user?.id);
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { elapsedMs, getElapsedMs, start: startTimer, stop: stopTimer, reset: resetTimer } = useRaceTimer();
  const runSubmittedRef = useRef(false);
  const raceInitKeyRef = useRef<string | null>(null);
  const isLeavingRaceRef = useRef(false);
  const pendingUrlSyncRef = useRef<string | null>(null);
  const skipNextArticleUrlSyncRef = useRef(false);
  const startBackGuardArmedRef = useRef(false);
  const pausedForArticleLoadRef = useRef(false);
  const runSectionRef = useRef<HTMLElement>(null);

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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [finalElapsedMs, setFinalElapsedMs] = useState(0);
  const [countdownValue, setCountdownValue] = useState<number | "GO" | null>(null);

  const randomChallengeQuery = useQuery({
    queryKey: ["race", modeId, "random-challenge"],
    queryFn: () => fetchRandomChallenge(modeId),
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

  const prefetchArticle = useCallback(
    (title: string) => {
      const trimmed = title.trim();
      if (!trimmed) {
        return;
      }

      void queryClient.prefetchQuery({
        queryKey: wikiArticleQueryKey(modeId, trimmed),
        queryFn: () => fetchArticle(trimmed, modeId),
        staleTime: WIKI_ARTICLE_STALE_TIME_MS,
      });
    },
    [modeId, queryClient],
  );

  const articleQuery = useQuery({
    queryKey: wikiArticleQueryKey(modeId, currentTitle),
    queryFn: () => fetchArticle(currentTitle, modeId),
    enabled: Boolean(currentTitle),
    staleTime: WIKI_ARTICLE_STALE_TIME_MS,
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
    mutationFn: (payload: RunSubmissionRequest) => submitRun(payload, { authenticated: isAuthenticated }),
  });

  const buildRunSubmissionPayload = useCallback(
    (durationMs: number): RunSubmissionRequest | null => {
      if (!challenge) {
        return null;
      }

      const alignedRoute =
        route.length > 0
          ? route.map((step, index) => (index === route.length - 1 ? challenge.targetTitle : step.title))
          : [challenge.startTitle, challenge.targetTitle];
      const canonicalSteps = alignedRoute.map((articleTitle, index) => ({
        stepIndex: index,
        articleTitle,
        normalizedArticleTitle: normalizeTitle(articleTitle, modeId),
        elapsedMs: route[index]?.visitedAtOffsetMs ?? (index === 0 ? 0 : durationMs),
        visitedAtIso: route[index]?.visitedAtIso ?? new Date(Date.now() - Math.max(durationMs - (route[index]?.visitedAtOffsetMs ?? 0), 0)).toISOString(),
        articleUrl:
          route[index]?.articleUrl ??
          `${wikiMode.baseUrl}${wikiMode.articlePathPrefixes[0]}${normalizeTitle(articleTitle, modeId)}`,
        kind: index === 0 ? ("start" as const) : index === alignedRoute.length - 1 ? ("target" as const) : ("intermediate" as const),
      }));

      return {
        challengeId: challenge.id,
        wikiMode: modeId,
        completed: true,
        durationMs,
        clickCount,
        route: alignedRoute,
        steps: canonicalSteps,
        challengeSnapshot: {
          label: challenge.label,
          startTitle,
          targetTitle: challenge.targetTitle,
          difficultyScore: challenge.difficultyScore,
          wikiId: modeId,
        },
      };
    },
    [challenge, clickCount, modeId, route, startTitle, wikiMode.articlePathPrefixes, wikiMode.baseUrl],
  );

  const completeRace = useCallback(() => {
    if (runSubmittedRef.current || status !== "active" || !challenge) {
      return;
    }

    runSubmittedRef.current = true;
    const durationMs = Math.max(getElapsedMs(), 1);
    stopTimer();
    setFinalElapsedMs(durationMs);
    setStatus("completed");
    setSubmitError(null);

    const payload = buildRunSubmissionPayload(durationMs);
    if (!payload) {
      setSubmitError("Unable to build run submission.");
      runSubmittedRef.current = false;
      return;
    }

    runSubmissionMutation.mutate(payload, {
      onSuccess: (persistedRun) => {
        setSavedRun(persistedRun);
        setSubmitError(null);
        void queryClient.invalidateQueries({ queryKey: ["profile"] });
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : "Run finished, but saving failed.";
        setSubmitError(message);
      },
    });
  }, [buildRunSubmissionPayload, challenge, getElapsedMs, queryClient, runSubmissionMutation, status, stopTimer]);

  const isArticleLoading = articleQuery.isPending;
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
        titleEquals(fetchedChallenge.startTitle, startFromUrl, modeId) &&
        titleEquals(fetchedChallenge.targetTitle, targetFromUrl, modeId)
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
        challenge: buildFallbackChallenge(startFromUrl, targetFromUrl, modeId),
      };
    }

    if (!randomChallengeQuery.data) {
      if (randomChallengeQuery.isError) {
        return {
          start: wikiMode.defaultStartTitle,
          target: wikiMode.defaultTargetTitle,
          challenge: {
            ...buildFallbackChallenge(wikiMode.defaultStartTitle, wikiMode.defaultTargetTitle, modeId),
            id: wikiMode.emergencyChallengeId,
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
  }, [
    modeId,
    randomChallengeQuery.data,
    randomChallengeQuery.isError,
    startFromUrl,
    targetFromUrl,
    wikiMode.defaultStartTitle,
    wikiMode.defaultTargetTitle,
    wikiMode.emergencyChallengeId,
  ]);

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
    const normalizedStart = wikiMode.parseTitleFromRaceUrl(startGoalPair.start);
    const normalizedTarget = wikiMode.parseTitleFromRaceUrl(startGoalPair.target);

    setChallenge(startGoalPair.challenge);
    setStartTitle(normalizedStart);
    setTargetTitle(normalizedTarget);
    setCurrentTitle(normalizedStart);
    setClickCount(0);
    setRoute([
      {
        title: normalizedStart,
        articleUrl: `${wikiMode.baseUrl}${wikiMode.articlePathPrefixes[0]}${normalizeTitle(normalizedStart, modeId)}`,
        visitedAtOffsetMs: 0,
        visitedAtIso: new Date().toISOString(),
        clickIndex: 0,
      },
    ]);
    setStatus("loading");
    setLastError(null);
    setSavedRun(null);
    setCountdownValue(null);
    resetTimer();
    pendingUrlSyncRef.current = null;
    skipNextArticleUrlSyncRef.current = false;
    startBackGuardArmedRef.current = false;
  }, [modeId, resetTimer, startGoalPair, randomChallengeQuery.data, randomChallengeQuery.isError, wikiMode.articlePathPrefixes, wikiMode.baseUrl]);

  useEffect(() => {
    if (startFromUrl) {
      prefetchArticle(wikiMode.parseTitleFromRaceUrl(startFromUrl));
    }
  }, [prefetchArticle, startFromUrl, wikiMode]);

  useEffect(() => {
    if (!randomChallengeQuery.data || (startFromUrl && targetFromUrl)) {
      return;
    }

    prefetchArticle(wikiMode.parseTitleFromRaceUrl(randomChallengeQuery.data.startTitle));
  }, [prefetchArticle, randomChallengeQuery.data, startFromUrl, targetFromUrl, wikiMode]);

  useEffect(() => {
    if (isLeavingRaceRef.current || !currentTitle || !startTitle || !targetTitle) {
      return;
    }

    const startFromUrl = safeTitleParam(searchParams.get("start"));
    const targetFromUrl = safeTitleParam(searchParams.get("target"));
    const articleFromUrl = safeTitleParam(searchParams.get("article"));
    const isBrowserHistoryNavigationInFlight =
      status === "active" &&
      !skipNextArticleUrlSyncRef.current &&
      articleFromUrl &&
      !titleEquals(articleFromUrl, currentTitle, modeId);

    if (isBrowserHistoryNavigationInFlight) {
      return;
    }

    if (
      searchParams.get("start") === startTitle &&
      searchParams.get("target") === targetTitle &&
      searchParams.get("article") === currentTitle
    ) {
      pendingUrlSyncRef.current = null;
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("mode", modeId);
    nextParams.set("start", startTitle);
    nextParams.set("target", targetTitle);
    nextParams.set("article", currentTitle);
    const shouldPushHistoryEntry =
      status === "active" &&
      startFromUrl !== null &&
      targetFromUrl !== null &&
      articleFromUrl !== null &&
      titleEquals(startFromUrl, startTitle, modeId) &&
      titleEquals(targetFromUrl, targetTitle, modeId) &&
      !titleEquals(articleFromUrl, currentTitle, modeId);

    const nextUrl = `/race?${nextParams.toString()}`;
    if (pendingUrlSyncRef.current === nextUrl) {
      return;
    }

    if (shouldPushHistoryEntry) {
      router.push(nextUrl, { scroll: false });
      pendingUrlSyncRef.current = nextUrl;
      return;
    }

    router.replace(nextUrl, { scroll: false });
    pendingUrlSyncRef.current = nextUrl;
  }, [currentTitle, modeId, router, searchParams, startTitle, status, targetTitle]);

  useEffect(() => {
    if (status !== "active" || isLeavingRaceRef.current) {
      return;
    }

    const articleFromUrl = safeTitleParam(searchParams.get("article"));
    if (!articleFromUrl) {
      return;
    }

    if (skipNextArticleUrlSyncRef.current) {
      if (titleEquals(articleFromUrl, currentTitle, modeId)) {
        skipNextArticleUrlSyncRef.current = false;
      }
      return;
    }

    if (titleEquals(articleFromUrl, currentTitle, modeId)) {
      return;
    }

    setLastError(null);
    setClickCount((value) => value + 1);
    setCurrentTitle(articleFromUrl);
    setRoute((previous) => [
      ...previous,
      {
        title: articleFromUrl,
        articleUrl: `${wikiMode.baseUrl}${wikiMode.articlePathPrefixes[0]}${normalizeTitle(articleFromUrl, modeId)}`,
        visitedAtOffsetMs: elapsedMs,
        visitedAtIso: new Date().toISOString(),
        clickIndex: previous.length,
      },
    ]);
  }, [currentTitle, elapsedMs, modeId, searchParams, status, wikiMode.articlePathPrefixes, wikiMode.baseUrl]);

  useEffect(() => {
    if (!articleQuery.error) {
      return;
    }

    const message = isRateLimitedError(articleQuery.error)
      ? wikiMode.rateLimitErrorMessage
      : articleQuery.error instanceof Error
        ? articleQuery.error.message
        : "Could not load article.";
    setLastError(message);
    if (status === "loading") {
      setStatus("error");
    }
  }, [articleQuery.error, status, wikiMode.rateLimitErrorMessage]);

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
      pausedForArticleLoadRef.current = false;
      return;
    }

    if (isArticleLoading) {
      if (!pausedForArticleLoadRef.current) {
        stopTimer();
        pausedForArticleLoadRef.current = true;
      }
      return;
    }

    if (pausedForArticleLoadRef.current) {
      startTimer();
      pausedForArticleLoadRef.current = false;
    }
  }, [isArticleLoading, startTimer, status, stopTimer]);

  useEffect(() => {
    if (status !== "active" || !challenge) {
      return;
    }

    const canonicalTitle = articleQuery.data?.title ?? articleQuery.data?.normalizedTitle ?? null;
    if (!reachedRaceTarget(currentTitle, challenge.targetTitle, canonicalTitle, modeId)) {
      return;
    }

    completeRace();
  }, [articleQuery.data, challenge, completeRace, currentTitle, modeId, status]);

  const handleAbandon = useCallback(() => {
    if (status !== "active" || isLeavingRaceRef.current) {
      return;
    }

    isLeavingRaceRef.current = true;
    runSubmittedRef.current = true;
    stopTimer();

    if (challenge) {
      const payload: RunSubmissionRequest = {
        challengeId: challenge.id,
        wikiMode: modeId,
        completed: false,
        durationMs: elapsedMs,
        clickCount,
        route: route.map((step) => step.title),
        steps: route.map((step, index) => ({
          stepIndex: index,
          articleTitle: step.title,
          normalizedArticleTitle: normalizeTitle(step.title, modeId),
          elapsedMs: step.visitedAtOffsetMs,
          visitedAtIso: step.visitedAtIso,
          articleUrl:
            step.articleUrl ??
            `${wikiMode.baseUrl}${wikiMode.articlePathPrefixes[0]}${normalizeTitle(step.title, modeId)}`,
          kind: index === 0 ? ("start" as const) : ("intermediate" as const),
        })),
        challengeSnapshot: {
          label: challenge.label,
          startTitle,
          targetTitle,
          difficultyScore: challenge.difficultyScore,
          wikiId: modeId,
        },
      };

      void runSubmissionMutation.mutateAsync(payload).finally(() => {
        void queryClient.invalidateQueries({ queryKey: ["profile"] });
      }).catch(() => {
        // Persistence is best-effort; navigation must not wait on the API.
      });
    }

    returnToSelection();
  }, [
    challenge,
    clickCount,
    elapsedMs,
    modeId,
    queryClient,
    returnToSelection,
    route,
    runSubmissionMutation,
    startTitle,
    status,
    stopTimer,
    targetTitle,
    wikiMode.articlePathPrefixes,
    wikiMode.baseUrl,
  ]);

  useEffect(() => {
    if (status !== "active") {
      return;
    }

    if (titleEquals(currentTitle, startTitle, modeId) && !startBackGuardArmedRef.current) {
      window.history.pushState({ ...(window.history.state ?? {}), wikirushStartBackGuard: true }, "", window.location.href);
      startBackGuardArmedRef.current = true;
    }

    const onPopState = () => {
      if (isLeavingRaceRef.current || !titleEquals(currentTitle, startTitle, modeId)) {
        return;
      }

      const shouldGiveUp = window.confirm(
        "Going back from the starting page will abandon this run and return you to race modes. Give up this run?"
      );
      if (shouldGiveUp) {
        startBackGuardArmedRef.current = false;
        void handleAbandon();
        return;
      }

      window.history.pushState({ ...(window.history.state ?? {}), wikirushStartBackGuard: true }, "", window.location.href);
      startBackGuardArmedRef.current = true;
    };

    window.addEventListener("popstate", onPopState);
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
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("keydown", onKeydown);
    };
  }, [currentTitle, handleAbandon, modeId, startTitle, status]);

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

  const readerShellBackgroundClass =
    modeId === "league"
      ? "bg-[#0a0e17]"
      : modeId === "pokemon"
        ? "bg-[#e4f3e4]"
        : modeId === "minecraft"
          ? "bg-[#303030]"
          : "bg-white";

  return (
    <section
      ref={runSectionRef}
      className={`relative min-h-[calc(100vh-4rem)] pb-8 ${readerShellBackgroundClass}`}
    >
      {isRaceActive ? (
        <RaceHud
          elapsedMs={elapsedMs}
          clickCount={clickCount}
          startTitle={startTitle}
          targetTitle={targetTitle}
          onAbandon={handleAbandon}
          portalContainerRef={runSectionRef}
        />
      ) : null}

      <div className="w-full">
        <WikipediaArticleView
          wikiMode={modeId}
          title={articleQuery.data?.title ?? currentTitle}
          displayTitle={articleQuery.data?.displayTitle ?? articleQuery.data?.title ?? currentTitle}
          html={articleQuery.data?.html ?? ""}
          isLoading={isArticleLoading}
          errorMessage={lastError}
          disableInteraction={isInteractionBlocked}
          onLinkHover={prefetchArticle}
          onInternalLinkClick={(nextTitle) => {
            if (isInteractionBlocked || !nextTitle) {
              return;
            }

            skipNextArticleUrlSyncRef.current = true;
            setLastError(null);
            setClickCount((value) => value + 1);
            setCurrentTitle(nextTitle);
            setRoute((previous) => [
              ...previous,
              {
                title: nextTitle,
                articleUrl: `${wikiMode.baseUrl}${wikiMode.articlePathPrefixes[0]}${normalizeTitle(nextTitle, modeId)}`,
                visitedAtOffsetMs: elapsedMs,
                visitedAtIso: new Date().toISOString(),
                clickIndex: previous.length,
              },
            ]);
          }}
        />
      </div>

      {isPreStartOverlayVisible ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101418]/80 px-4">
          <Card className="w-full max-w-xl border-[#2a3b47] bg-[#101418] p-6 text-[#f8fbff] shadow-2xl">
            <p className="text-xs uppercase tracking-[0.2em] text-[#7aa6c2]">{wikiMode.raceLabel}</p>
            <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Get ready</h2>
            <div className="mt-5 grid gap-3 text-left sm:grid-cols-2">
              <div className="rounded-md border border-[#2a3b47] bg-[#16222b] p-3">
                <p className="text-xs uppercase tracking-wide text-[#9fc4d9]">Start</p>
                <p className="mt-1 text-base font-semibold text-white">{startTitle || "…"}</p>
              </div>
              <div className="rounded-md border border-[#2a3b47] bg-[#16222b] p-3">
                <p className="text-xs uppercase tracking-wide text-[#9fc4d9]">Goal</p>
                <p className="mt-1 text-base font-semibold text-white">{targetTitle || "…"}</p>
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

      {status === "abandoned" ? (
        <div className="w-full px-2 sm:px-3">
          <Card className="mt-4 border-[#a2a9b1] bg-[#f8f9fa] p-4 text-sm text-[#202122]">
            <p className="font-medium">Run abandoned.</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={returnToSelection}>
              Back to Race Modes
            </Button>
          </Card>
        </div>
      ) : null}

      {challenge ? (
        <CompletionModal
          open={status === "completed"}
          challenge={challenge}
          elapsedMs={finalElapsedMs || elapsedMs}
          clickCount={clickCount}
          submittedRun={savedRun ?? undefined}
          isSubmitting={runSubmissionMutation.isPending}
          submitError={submitError}
          onReplay={() => {
            runSubmittedRef.current = false;
            raceInitKeyRef.current = null;
            setSavedRun(null);
            setSubmitError(null);
            setFinalElapsedMs(0);
            resetTimer();
            setCountdownValue(null);
            setStatus("loading");
          }}
          onNewChallenge={() => {
            runSubmittedRef.current = false;
            raceInitKeyRef.current = null;
            setSavedRun(null);
            setSubmitError(null);
            setFinalElapsedMs(0);
            resetTimer();
            setCountdownValue(null);
            if (!startFromUrl || !targetFromUrl) {
              void randomChallengeQuery.refetch();
            } else {
              returnToSelection();
              return;
            }
            setStatus("loading");
          }}
        />
      ) : null}
    </section>
  );
}

/** Shared race runner — pass `modeId` from {@link ALL_WIKI_MODES}. */
export const WikiRaceRunner = WikipediaRaceRunner;
