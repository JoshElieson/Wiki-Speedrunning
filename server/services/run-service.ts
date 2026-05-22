import { ApiError } from "@/server/errors/api-error";
import { getChallengeById } from "@/server/repositories/challenge-repository";
import { getRunById, saveRun } from "@/server/repositories/run-repository";
import { ensureUser } from "@/server/repositories/user-repository";
import type { RunSubmissionRequest } from "@/server/types/api";
import { validateCompletedRoute } from "./race/route-validation-service";

function computeRunScore(durationMs: number, clickCount: number): number {
  return Math.max(1000 - Math.floor(durationMs / 100) - clickCount * 4, 0);
}

export async function submitRun(payload: RunSubmissionRequest) {
  if (payload.durationMs <= 0 || payload.clickCount < 0 || payload.route.length < 2) {
    throw new ApiError(400, "INVALID_RUN_PAYLOAD", "Invalid run submission payload");
  }

  const challenge = await getChallengeById(payload.challengeId);
  await validateCompletedRoute({
    challengeStartTitle: challenge.startTitle,
    challengeTargetTitle: challenge.targetTitle,
    route: payload.route,
    steps: payload.steps,
  });

  const user = await ensureUser(payload.userId);
  const score = computeRunScore(payload.durationMs, payload.clickCount);

  return saveRun({
    userId: user.id,
    challengeId: payload.challengeId,
    durationMs: payload.durationMs,
    clickCount: payload.clickCount,
    route: payload.route,
    steps: payload.steps,
    score,
  });
}

export async function fetchRunById(runId: string) {
  return getRunById(runId);
}
