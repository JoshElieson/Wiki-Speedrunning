"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRaceElapsedMs, useRaceStore } from "../stores/use-race-store";
import type { ChallengeDescriptor, PersistedRun, RunSubmission, WikiArticle } from "@/types/domain";

interface SubmitRunPayload extends RunSubmission {
  challengeId: string;
}

function normalizeTitle(title: string) {
  return title.trim().replace(/\s+/g, "_").replace(/#/g, "").toLowerCase();
}

async function fetchNextChallenge() {
  const response = await fetch("/api/challenges/next");
  if (!response.ok) {
    throw new Error("Failed to load challenge");
  }

  return (await response.json()) as ChallengeDescriptor;
}

async function fetchArticle(title: string) {
  const response = await fetch(`/api/wiki/article?title=${encodeURIComponent(title)}`);
  if (!response.ok) {
    throw new Error("Failed to load article");
  }

  return (await response.json()) as WikiArticle;
}

async function submitRun(payload: SubmitRunPayload) {
  const response = await fetch("/api/runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Run submission failed");
  }

  return (await response.json()) as PersistedRun;
}

export function useRaceController() {
  const race = useRaceStore();
  const queryClient = useQueryClient();
  const [clockTick, setClockTick] = useState(0);
  const [invalidMoveTitle, setInvalidMoveTitle] = useState<string | null>(null);
  const submittedRunRef = useRef(false);

  const challengeQuery = useQuery({
    queryKey: ["challenge", "next"],
    queryFn: fetchNextChallenge,
    enabled: race.status === "idle" || race.status === "loading",
    retry: 1,
  });

  const articleQuery = useQuery({
    queryKey: ["wiki", "article", race.currentArticleTitle],
    queryFn: () => fetchArticle(race.currentArticleTitle ?? ""),
    enabled: Boolean(race.currentArticleTitle),
    retry: 1,
  });

  const runSubmissionMutation = useMutation({
    mutationFn: submitRun,
  });

  useEffect(() => {
    if (race.status !== "active") {
      return;
    }

    const timer = setInterval(() => {
      setClockTick(Date.now());
    }, 40);

    return () => clearInterval(timer);
  }, [race.status]);

  useEffect(() => {
    if (race.status !== "idle") {
      return;
    }

    race.setRaceLoading();
  }, [race]);

  useEffect(() => {
    if (!challengeQuery.data) {
      return;
    }

    if (race.status === "idle" || race.status === "loading") {
      race.startRace(challengeQuery.data);
      submittedRunRef.current = false;
      runSubmissionMutation.reset();
    }
  }, [challengeQuery.data, race, runSubmissionMutation]);

  useEffect(() => {
    if (!challengeQuery.error) {
      return;
    }

    const message = challengeQuery.error instanceof Error ? challengeQuery.error.message : "Unable to load challenge";
    race.setRaceError(message);
  }, [challengeQuery.error, race]);

  useEffect(() => {
    if (!articleQuery.error || race.status !== "active") {
      return;
    }

    const message = articleQuery.error instanceof Error ? articleQuery.error.message : "Unable to load article";
    race.setRaceError(message);
  }, [articleQuery.error, race.status, race]);

  useEffect(() => {
    if (race.status !== "completed" || !race.challenge || submittedRunRef.current) {
      return;
    }

    const payload: SubmitRunPayload = {
      challengeId: race.challenge.id,
      durationMs: getRaceElapsedMs(race),
      clickCount: race.clickCount,
      route: race.routeHistory.map((node) => node.title),
      steps: race.routeHistory.slice(1).map((node, index) => ({
        fromTitle: race.routeHistory[index].title,
        toTitle: node.title,
        clickedAtOffsetMs: node.visitedAtOffsetMs,
      })),
    };

    submittedRunRef.current = true;
    runSubmissionMutation.mutate(payload);
  }, [race, runSubmissionMutation]);

  const elapsedMs = useMemo(() => {
    if (race.status !== "active") {
      return getRaceElapsedMs(race);
    }

    if (!race.startedAtMs) {
      return 0;
    }

    const now = clockTick || Date.now();
    return Math.max(now - race.startedAtMs, 0);
  }, [clockTick, race]);

  const isArticleTransitioning = useMemo(() => {
    if (!race.currentArticleTitle) {
      return false;
    }

    if (articleQuery.isPending) {
      return true;
    }

    if (!articleQuery.isFetching || !articleQuery.data) {
      return false;
    }

    return normalizeTitle(articleQuery.data.title) !== normalizeTitle(race.currentArticleTitle);
  }, [articleQuery.data, articleQuery.isFetching, articleQuery.isPending, race.currentArticleTitle]);

  const isMoveValid = useCallback(
    (targetTitle: string) => {
      if (!articleQuery.data) {
        return false;
      }

      return articleQuery.data.links.some((link) => normalizeTitle(link.normalizedTitle) === normalizeTitle(targetTitle));
    },
    [articleQuery.data]
  );

  const navigateToLink = useCallback(
    (targetTitle: string) => {
      if (race.status !== "active") {
        return;
      }

      if (!isMoveValid(targetTitle)) {
        setInvalidMoveTitle(targetTitle);
        return;
      }

      setInvalidMoveTitle(null);
      race.visitArticle(targetTitle);
    },
    [isMoveValid, race]
  );

  const restartRace = useCallback(() => {
    submittedRunRef.current = false;
    setInvalidMoveTitle(null);
    runSubmissionMutation.reset();
    race.restartRace();
    void queryClient.invalidateQueries({ queryKey: ["wiki", "article"] });
  }, [queryClient, race, runSubmissionMutation]);

  const loadFreshChallenge = useCallback(() => {
    submittedRunRef.current = false;
    setInvalidMoveTitle(null);
    runSubmissionMutation.reset();
    race.resetRace();
    race.setRaceLoading();
    void challengeQuery.refetch();
  }, [challengeQuery, race, runSubmissionMutation]);

  const abandonRace = useCallback(() => {
    race.abandonRace();
  }, [race]);

  return {
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
  };
}
