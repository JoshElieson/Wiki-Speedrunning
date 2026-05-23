import { create } from "zustand";
import type { RaceActions, RaceState, RouteNode } from "../types/race-state";
import { normalizeWikiTitle, raceTargetTitleMatches } from "@/features/wiki/services/title-normalization";

const initialState: RaceState = {
  status: "idle",
  challenge: null,
  currentArticle: null,
  targetArticle: null,
  route: [],
  clickCount: 0,
  startedAt: null,
  completedAt: null,
  elapsedMs: 0,
  error: null,
};

function makeRouteNode(title: string, startedAtMs: number): RouteNode {
  return {
    title,
    visitedAtOffsetMs: Date.now() - startedAtMs,
  };
}

export const useRaceStore = create<RaceState & RaceActions>((set, get) => ({
  ...initialState,
  setRaceLoading: () => {
    const state = get();
    if (state.status === "active") {
      return;
    }

    set({ status: "loading", error: null });
  },
  startRace: (challenge, startArticleTitle) => {
    const startedAt = Date.now();
    const normalizedStart = normalizeWikiTitle(startArticleTitle);
    const normalizedTarget = normalizeWikiTitle(challenge.targetTitle);
    set({
      status: "active",
      challenge,
      currentArticle: { title: normalizedStart.replace(/_/g, " "), normalizedTitle: normalizedStart },
      targetArticle: { title: normalizedTarget.replace(/_/g, " "), normalizedTitle: normalizedTarget },
      route: [{ title: normalizedStart.replace(/_/g, " "), visitedAtOffsetMs: 0 }],
      clickCount: 0,
      startedAt,
      completedAt: null,
      elapsedMs: 0,
      error: null,
    });
  },
  visitArticle: (nextArticleTitle, normalizedTitle, nowMs = Date.now()) => {
    const state = get();
    if (state.status !== "active" || !state.startedAt) {
      return;
    }

    const articleTitle = nextArticleTitle.trim();
    const articleNormalized = normalizeWikiTitle(normalizedTitle || nextArticleTitle);
    const elapsedMs = Math.max(nowMs - state.startedAt, 0);
    set({
      currentArticle: { title: articleTitle, normalizedTitle: articleNormalized },
      route: [...state.route, makeRouteNode(articleTitle, state.startedAt)],
      clickCount: state.clickCount + 1,
      elapsedMs,
    });

    if (state.targetArticle && raceTargetTitleMatches(articleTitle, state.targetArticle.title, articleNormalized)) {
      get().completeRace();
    }
  },
  completeRace: () => {
    if (get().status !== "active") {
      return;
    }

    const completedAt = Date.now();
    const state = get();
    set({
      status: "completed",
      completedAt,
      elapsedMs: state.startedAt ? Math.max(completedAt - state.startedAt, 0) : state.elapsedMs,
    });
  },
  abandonRace: () => {
    const state = get();
    if (state.status === "idle" || state.status === "loading") {
      return;
    }

    set({ status: "idle", challenge: null, currentArticle: null, targetArticle: null, route: [], clickCount: 0, startedAt: null, completedAt: null, elapsedMs: 0, error: null });
  },
  restartRace: () => {
    const challenge = get().challenge;
    if (!challenge) {
      set(initialState);
      return;
    }

    get().startRace(challenge, challenge.startTitle);
  },
  setRaceError: (message) => {
    set({ status: "error", completedAt: Date.now(), error: message });
  },
  clearError: () => set({ error: null }),
  tickElapsed: (nowMs = Date.now()) => {
    const state = get();
    if (!state.startedAt || state.status !== "active") {
      return;
    }

    set({ elapsedMs: Math.max(nowMs - state.startedAt, 0) });
  },
  resetRace: () => set(initialState),
}));

export function getRaceElapsedMs(state: RaceState) {
  if (!state.startedAt) {
    return 0;
  }

  if (state.status === "active") {
    return state.elapsedMs;
  }

  const end = state.completedAt ?? Date.now();
  return Math.max(end - state.startedAt, 0);
}
