import type { ChallengeDescriptor, LeaderboardRow, RunStepInput, WikiArticle } from "@/types/domain";

export interface ApiErrorObject {
  code: string;
  message: string;
  details?: unknown;
}

export type ApiSuccessResponse<T> = {
  ok: true;
  data: T;
};

export type ApiErrorResponse = {
  ok: false;
  error: ApiErrorObject;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface CreateChallengeRequest {
  label: string;
  description?: string;
  startTitle: string;
  targetTitle: string;
  difficultyScore?: number;
  shortestPathHint?: number;
  seed?: string;
  isActive?: boolean;
}

export interface ValidateMoveRequest {
  challengeId: string;
  currentTitle: string;
  nextTitle: string;
  targetTitle?: string;
  path?: string[];
}

export interface ValidateMoveResponse {
  isValid: boolean;
  completed: boolean;
  normalizedCurrentTitle: string;
  normalizedNextTitle: string;
  normalizedTargetTitle?: string;
  reason?: string;
}

export interface RunSubmissionRequest {
  challengeId: string;
  userId?: string;
  durationMs: number;
  clickCount: number;
  route: string[];
  steps: RunStepInput[];
}

export interface RunDetailResponse {
  id: string;
  challengeId: string;
  challengeLabel: string;
  userId: string;
  username: string;
  status: "COMPLETED" | "ABANDONED" | "DISQUALIFIED";
  durationMs: number;
  clickCount: number;
  score: number;
  route: string[];
  steps: Array<{
    sequence: number;
    fromTitle: string;
    toTitle: string;
    clickedAtOffsetMs: number;
  }>;
  createdAt: string;
  startedAt: string;
  finishedAt: string;
}

export interface ChallengePayload extends ChallengeDescriptor {
  description?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface LeaderboardResponse {
  rows: LeaderboardRow[];
}

export type ArticleResponse = WikiArticle;
