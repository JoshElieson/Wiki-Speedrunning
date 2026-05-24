export type RunStatusValue = "COMPLETED" | "ABANDONED" | "DISQUALIFIED";

export type RunStepKind = "start" | "intermediate" | "target";

/**
 * Ordered route node persisted in ReplayMetadata.timelineJson.
 * elapsedMs is always relative to run start (0 for the first node).
 */
export interface RoutePathNode {
  stepIndex: number;
  articleTitle: string;
  normalizedArticleTitle: string;
  articleUrl?: string;
  wikipediaPageId?: number;
  elapsedMs: number;
  visitedAtIso?: string;
}

/**
 * Canonical route timeline payload stored in ReplayMetadata.timelineJson.
 * {
 *   version: "route_path_v1",
 *   nodes: RoutePathNode[]
 * }
 */
export interface RoutePathData {
  version: "route_path_v1";
  nodes: RoutePathNode[];
}

export interface RunStepDetail {
  stepIndex: number;
  articleTitle: string;
  normalizedArticleTitle: string;
  elapsedMs: number;
  articleUrl?: string;
  visitedAtIso?: string;
  kind: RunStepKind;
}

export interface SaveRunStepInput {
  stepIndex: number;
  articleTitle: string;
  normalizedArticleTitle?: string;
  elapsedMs: number;
  articleUrl?: string;
  visitedAtIso?: string;
  kind?: RunStepKind;
}

export interface LegacyRunTransitionStep {
  fromTitle: string;
  toTitle: string;
  clickedAtOffsetMs: number;
}

export interface SaveRunChallengeSnapshot {
  label: string;
  startTitle: string;
  targetTitle: string;
  difficultyScore: number;
  shortestPathHint?: number;
}

export interface SaveRunRequest {
  /** Set server-side from the authenticated session; never trusted from the client body alone. */
  sessionUserId?: string | null;
  userId?: string | null;
  challengeId: string;
  wikiMode?: import("@/lib/wiki-modes").WikiModeId;
  challengeSnapshot?: SaveRunChallengeSnapshot;
  completed: boolean;
  finalElapsedMs: number;
  clickCount: number;
  route: string[];
  difficultyScore?: number;
  startedAt?: string;
  completedAt?: string;
  steps: Array<SaveRunStepInput | LegacyRunTransitionStep>;
}

export interface SaveRunResponse {
  run: RunDetail;
}

export interface RunHistoryItem {
  id: string;
  challengeId: string;
  challengeLabel: string;
  wikiMode: import("@/lib/wiki-modes").WikiModeId;
  userId: string;
  username: string;
  status: RunStatusValue;
  finalElapsedMs: number;
  clickCount: number;
  score: number;
  eloDelta: number;
  difficultyScore: number;
  route: string[];
  completedAt: string;
}

export interface RunDetail extends RunHistoryItem {
  startedAt: string;
  createdAt: string;
  startArticleTitle: string;
  targetArticleTitle: string;
  steps: RunStepDetail[];
  routePath: RoutePathData;
}

export interface MatchHistoryFilters {
  userId?: string;
  challengeId?: string;
  limit?: number;
}
