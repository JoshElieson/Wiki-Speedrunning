import type { ChallengeDescriptor } from "@/types/domain";

export type RaceStatus = "idle" | "loading" | "active" | "completed" | "abandoned" | "error";

export interface RouteNode {
  title: string;
  visitedAtOffsetMs: number;
}

export interface RaceArticleRef {
  title: string;
  normalizedTitle: string;
}

export interface RaceState {
  status: RaceStatus;
  challenge: ChallengeDescriptor | null;
  currentArticle: RaceArticleRef | null;
  targetArticle: RaceArticleRef | null;
  route: RouteNode[];
  clickCount: number;
  startedAt: number | null;
  completedAt: number | null;
  elapsedMs: number;
  error: string | null;
}

export interface RaceActions {
  setRaceLoading: () => void;
  startRace: (challenge: ChallengeDescriptor, startArticleTitle: string) => void;
  visitArticle: (nextArticleTitle: string, normalizedTitle: string, nowMs?: number) => void;
  completeRace: () => void;
  abandonRace: () => void;
  restartRace: () => void;
  setRaceError: (message: string) => void;
  clearError: () => void;
  tickElapsed: (nowMs?: number) => void;
  resetRace: () => void;
}
