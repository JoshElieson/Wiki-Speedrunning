import type { ChallengeDescriptor, MoveValidationResult } from "@/types/domain";
import type { RunSubmissionRequest } from "@/server/types/api";
import type { RunDetail } from "@/server/types/run-history";
import { parseJsonOrThrow } from "@/lib/parse-json-response";

export async function fetchRandomChallenge(): Promise<ChallengeDescriptor> {
  const response = await fetch("/api/challenges/random");
  return parseJsonOrThrow<ChallengeDescriptor>(response, "Failed to fetch challenge");
}

export async function fetchChallengeById(challengeId: string): Promise<ChallengeDescriptor> {
  const response = await fetch(`/api/challenges/${encodeURIComponent(challengeId)}`);
  return parseJsonOrThrow<ChallengeDescriptor>(response, "Failed to fetch challenge");
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

export async function submitRun(payload: RunSubmissionRequest): Promise<RunDetail> {
  const response = await fetch("/api/runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJsonOrThrow<RunDetail>(response, "Run submission failed");
}

export async function fetchRunById(runId: string): Promise<RunDetail> {
  const response = await fetch(`/api/runs/${encodeURIComponent(runId)}`);
  return parseJsonOrThrow<RunDetail>(response, "Failed to fetch run");
}
