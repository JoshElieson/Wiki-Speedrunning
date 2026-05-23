"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchRandomChallenge, submitRun, validateMove } from "../services/race-api";
import { fetchWikiArticle } from "@/features/wiki/services/wiki-client";
import { getRaceElapsedMs, useRaceStore } from "../stores/use-race-store";
import { raceTargetTitleMatches, toWikiTitleKey } from "@/features/wiki/services/title-normalization";
import type { RunSubmissionRequest } from "@/server/types/api";
import type { RunDetail } from "@/server/types/run-history";

export function useRaceController() {
  const race = useRaceStore();
  const raceStatus = race.status;
  const setRaceError = race.setRaceError;
  const tickElapsed = race.tickElapsed;
  const queryClient = useQueryClient();
  const [clockTick, setClockTick] = useState(0);
  const [invalidMoveTitle, setInvalidMoveTitle] = useState<string | null>(null);
  const submittedRunRef = useRef(false);
  const [pendingMoveTitle, setPendingMoveTitle] = useState<string | null>(null);

  const articleQuery = useQuery({
    queryKey: ["wiki", "article", race.currentArticle?.normalizedTitle],
    queryFn: () => fetchWikiArticle(race.currentArticle?.title ?? ""),
    enabled: Boolean(race.currentArticle?.title),
    retry: 1,
  });

  const challengeQuery = useQuery({
    queryKey: ["challenge", "random"],
    queryFn: fetchRandomChallenge,
    enabled: false,
    retry: 1,
  });

  const moveValidationMutation = useMutation({ mutationFn: validateMove });
  const runSubmissionMutation = useMutation<RunDetail, Error, RunSubmissionRequest>({ mutationFn: submitRun });

  useEffect(() => {
    if (raceStatus !== "active") {
      return;
    }

    const timer = setInterval(() => {
      setClockTick(Date.now());
      tickElapsed();
    }, 40);

    return () => clearInterval(timer);
  }, [raceStatus, tickElapsed]);

  useEffect(() => {
    if (!articleQuery.error || raceStatus !== "active") {
      return;
    }

    const message = articleQuery.error instanceof Error ? articleQuery.error.message : "Unable to load article";
    setRaceError(message);
  }, [articleQuery.error, raceStatus, setRaceError]);

  useEffect(() => {
    if (raceStatus !== "active" || !race.targetArticle || !articleQuery.data) {
      return;
    }

    const visitedTitle = race.currentArticle?.title ?? "";
    if (!raceTargetTitleMatches(visitedTitle, race.targetArticle.title, articleQuery.data.title)) {
      return;
    }

    race.completeRace();
  }, [articleQuery.data, race, raceStatus]);

  useEffect(() => {
    if (race.status !== "completed" || !race.challenge || submittedRunRef.current) {
      return;
    }

    const alignedRoute =
      race.route.length > 0
        ? race.route.map((node, index) =>
            index === race.route.length - 1 ? race.challenge!.targetTitle : node.title,
          )
        : [race.challenge.startTitle, race.challenge.targetTitle];

    const payload: RunSubmissionRequest = {
      challengeId: race.challenge.id,
      durationMs: Math.max(getRaceElapsedMs(race), 1),
      clickCount: race.clickCount,
      route: alignedRoute,
      steps: alignedRoute.slice(1).map((toTitle, index) => ({
        fromTitle: alignedRoute[index],
        toTitle,
        clickedAtOffsetMs: race.route[index + 1]?.visitedAtOffsetMs ?? getRaceElapsedMs(race),
      })),
      challengeSnapshot: {
        label: race.challenge.label,
        startTitle: race.challenge.startTitle,
        targetTitle: race.challenge.targetTitle,
        difficultyScore: race.challenge.difficultyScore,
      },
    };

    submittedRunRef.current = true;
    runSubmissionMutation.mutate(payload, {
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: ["profile"] });
      },
    });
  }, [queryClient, race, runSubmissionMutation]);

  const elapsedMs = useMemo(() => {
    if (race.status !== "active") {
      return getRaceElapsedMs(race);
    }

    if (!race.startedAt) {
      return 0;
    }

    const now = clockTick || Date.now();
    return Math.max(now - race.startedAt, 0);
  }, [clockTick, race]);

  const isArticleTransitioning = useMemo(() => {
    if (!race.currentArticle?.title) {
      return false;
    }

    if (articleQuery.isPending) {
      return true;
    }

    if (!articleQuery.isFetching || !articleQuery.data) {
      return false;
    }

    return toWikiTitleKey(articleQuery.data.normalizedTitle) !== toWikiTitleKey(race.currentArticle.normalizedTitle);
  }, [articleQuery.data, articleQuery.isFetching, articleQuery.isPending, race.currentArticle]);

  const navigateToLink = useCallback(
    async (targetTitle: string) => {
      if (race.status !== "active" || !race.currentArticle || !race.challenge || pendingMoveTitle) {
        return;
      }

      setPendingMoveTitle(targetTitle);
      try {
        const validation = await moveValidationMutation.mutateAsync({
          challengeId: race.challenge.id,
          currentTitle: race.currentArticle.title,
          nextTitle: targetTitle,
          targetTitle: race.targetArticle?.title,
        });
        if (!validation.isValid) {
          setInvalidMoveTitle(targetTitle);
          return;
        }

        setInvalidMoveTitle(null);
        race.visitArticle(targetTitle, validation.normalizedNextTitle);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Move validation failed";
        race.setRaceError(message);
      } finally {
        setPendingMoveTitle(null);
      }
    },
    [moveValidationMutation, pendingMoveTitle, race]
  );

  const restartRace = useCallback(() => {
    submittedRunRef.current = false;
    setInvalidMoveTitle(null);
    setPendingMoveTitle(null);
    runSubmissionMutation.reset();
    moveValidationMutation.reset();
    race.restartRace();
    void queryClient.invalidateQueries({ queryKey: ["wiki", "article"] });
  }, [moveValidationMutation, queryClient, race, runSubmissionMutation]);

  const startRace = useCallback(async () => {
    submittedRunRef.current = false;
    setInvalidMoveTitle(null);
    setPendingMoveTitle(null);
    runSubmissionMutation.reset();
    moveValidationMutation.reset();
    race.resetRace();
    race.setRaceLoading();
    try {
      const challenge = await queryClient.fetchQuery({
        queryKey: ["challenge", "random"],
        queryFn: fetchRandomChallenge,
      });
      race.startRace(challenge, challenge.startTitle);
      await queryClient.invalidateQueries({ queryKey: ["wiki", "article"] });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load challenge";
      race.setRaceError(message);
    }
  }, [moveValidationMutation, queryClient, race, runSubmissionMutation]);

  const loadFreshChallenge = useCallback(async () => {
    await startRace();
  }, [startRace]);

  const abandonRace = useCallback(async () => {
    if (race.status !== "active" || !race.challenge) {
      return;
    }

    const payload: RunSubmissionRequest = {
      challengeId: race.challenge.id,
      completed: false,
      durationMs: getRaceElapsedMs(race),
      clickCount: race.clickCount,
      route: race.route.map((node) => node.title),
      steps: race.route.slice(1).map((node, index) => ({
        fromTitle: race.route[index].title,
        toTitle: node.title,
        clickedAtOffsetMs: node.visitedAtOffsetMs,
      })),
      challengeSnapshot: {
        label: race.challenge.label,
        startTitle: race.challenge.startTitle,
        targetTitle: race.challenge.targetTitle,
        difficultyScore: race.challenge.difficultyScore,
      },
    };

    try {
      await runSubmissionMutation.mutateAsync(payload);
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch {
      // Still reset local race state when persistence fails (e.g. offline).
    } finally {
      submittedRunRef.current = false;
      setInvalidMoveTitle(null);
      setPendingMoveTitle(null);
      runSubmissionMutation.reset();
      moveValidationMutation.reset();
      race.abandonRace();
      void queryClient.invalidateQueries({ queryKey: ["wiki", "article"] });
    }
  }, [moveValidationMutation, queryClient, race, runSubmissionMutation]);

  return {
    race,
    elapsedMs,
    invalidMoveTitle,
    pendingMoveTitle,
    challengeQuery,
    articleQuery,
    moveValidationMutation,
    runSubmissionMutation,
    isArticleTransitioning,
    startRace,
    navigateToLink,
    restartRace,
    loadFreshChallenge,
    abandonRace,
  };
}
