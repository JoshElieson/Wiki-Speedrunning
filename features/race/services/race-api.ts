import type { ChallengeDescriptor, MoveValidationResult, WikiArticle } from "@/types/domain";
import type { RunDetailResponse, RunSubmissionRequest } from "@/server/types/api";

async function parseJsonOrThrow<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;
    throw new Error(payload?.error?.message || fallbackMessage);
  }

  return (await response.json()) as T;
}

export async function fetchChallengeById(challengeId: string): Promise<ChallengeDescriptor> {
  const response = await fetch(`/api/challenges/${encodeURIComponent(challengeId)}`);
  return parseJsonOrThrow<ChallengeDescriptor>(response, "Failed to fetch challenge");
}

export async function createChallenge(payload: {
  label: string;
  startTitle: string;
  targetTitle: string;
  description?: string;
  difficultyScore?: number;
  shortestPathHint?: number;
}): Promise<ChallengeDescriptor> {
  const response = await fetch("/api/challenges", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJsonOrThrow<ChallengeDescriptor>(response, "Failed to create challenge");
}

export async function fetchArticle(title: string): Promise<WikiArticle> {
  const response = await fetch(`/api/wiki/article?title=${encodeURIComponent(title)}`);
  return parseJsonOrThrow<WikiArticle>(response, "Failed to load article");
}

export async function validateMove(payload: {
  challengeId: string;
  currentTitle: string;
  nextTitle: string;
  targetTitle?: string;
}): Promise<MoveValidationResult> {
  const response = await fetch("/api/moves/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJsonOrThrow<MoveValidationResult>(response, "Move validation failed");
}

export async function submitRun(payload: RunSubmissionRequest): Promise<RunDetailResponse> {
  const response = await fetch("/api/runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJsonOrThrow<RunDetailResponse>(response, "Run submission failed");
}

export async function fetchRunById(runId: string): Promise<RunDetailResponse> {
  const response = await fetch(`/api/runs/${encodeURIComponent(runId)}`);
  return parseJsonOrThrow<RunDetailResponse>(response, "Failed to fetch run");
}
