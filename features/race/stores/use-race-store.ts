import { create } from "zustand";
import type { RaceActions, RaceState, RouteNode } from "../types/race-state";

const initialState: RaceState = {
  status: "idle",
  challenge: null,
  currentArticleTitle: null,
  targetArticleTitle: null,
  routeHistory: [],
  clickCount: 0,
  startedAtMs: null,
  finishedAtMs: null,
  errorMessage: null,
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

    set({ status: "loading", errorMessage: null });
  },
  startRace: (challenge) => {
    const startedAtMs = Date.now();
    set({
      status: "active",
      challenge,
      currentArticleTitle: challenge.startTitle,
      targetArticleTitle: challenge.targetTitle,
      routeHistory: [{ title: challenge.startTitle, visitedAtOffsetMs: 0 }],
      clickCount: 0,
      startedAtMs,
      finishedAtMs: null,
      errorMessage: null,
    });
  },
  visitArticle: (title) => {
    const state = get();
    if (state.status !== "active" || !state.startedAtMs) {
      return;
    }

    set({
      currentArticleTitle: title,
      routeHistory: [...state.routeHistory, makeRouteNode(title, state.startedAtMs)],
      clickCount: state.clickCount + 1,
    });

    if (state.targetArticleTitle && title === state.targetArticleTitle) {
      get().completeRace();
    }
  },
  completeRace: () => {
    if (get().status !== "active") {
      return;
    }

    set({ status: "completed", finishedAtMs: Date.now() });
  },
  abandonRace: () => {
    const state = get();
    if (state.status === "idle" || state.status === "loading") {
      return;
    }

    set({ status: "abandoned", finishedAtMs: Date.now() });
  },
  restartRace: () => {
    const challenge = get().challenge;
    if (!challenge) {
      set(initialState);
      return;
    }

    get().startRace(challenge);
  },
  setRaceError: (message) => {
    const finishedAtMs = get().finishedAtMs ?? Date.now();
    set({ status: "error", finishedAtMs, errorMessage: message });
  },
  clearRaceError: () => set({ errorMessage: null }),
  resetRace: () => set(initialState),
}));

export function getRaceElapsedMs(state: RaceState) {
  if (!state.startedAtMs) {
    return 0;
  }

  const end = state.finishedAtMs ?? Date.now();
  return Math.max(end - state.startedAtMs, 0);
}
