import type { ChallengeDescriptor } from "@/types/domain";

export type RaceStatus = "idle" | "loading" | "active" | "completed" | "abandoned" | "error";

export interface RouteNode {
  title: string;
  visitedAtOffsetMs: number;
}

export interface RaceState {
  status: RaceStatus;
  challenge: ChallengeDescriptor | null;
  currentArticleTitle: string | null;
  targetArticleTitle: string | null;
  routeHistory: RouteNode[];
  clickCount: number;
  startedAtMs: number | null;
  finishedAtMs: number | null;
  errorMessage: string | null;
}

export interface RaceActions {
  setRaceLoading: () => void;
  startRace: (challenge: ChallengeDescriptor) => void;
  visitArticle: (title: string) => void;
  completeRace: () => void;
  abandonRace: () => void;
  restartRace: () => void;
  setRaceError: (message: string) => void;
  clearRaceError: () => void;
  resetRace: () => void;
}
