import { isDatabaseConfigured, isPrismaConfigError } from "@/lib/database";
import { ApiError } from "@/server/errors/api-error";
import { getWikiModeConfig, getWikiModeId } from "@/lib/wiki-modes";
import { calculateSoloEloDelta } from "@/lib/elo";
import { resolveChallengeForRun } from "@/server/services/challenge-service";
import { getRecentRuns, getRunById, getRunsForChallenge, getRunsForUser, saveRun } from "@/server/repositories/run-repository";
import { ensureUser } from "@/server/repositories/user-repository";
import type {
  MatchHistoryFilters,
  LegacyRunTransitionStep,
  RoutePathData,
  RunDetail,
  RunStepDetail,
  SaveRunRequest,
  SaveRunResponse,
  SaveRunStepInput,
} from "@/server/types/run-history";
import type { RunSubmissionRequest } from "@/server/types/api";
import { normalizeWikiTitle } from "@/server/services/wiki/title-normalization";
import { validateCompletedRoute } from "./race/route-validation-service";
import { applySoloMatchElo, refreshLeaderboardStatsForScope } from "./rating-service";

function computeRunScore(durationMs: number, clickCount: number): number {
  return Math.max(1000 - Math.floor(durationMs / 100) - clickCount * 4, 0);
}

const inMemoryRuns = new Map<string, RunDetail>();

function asCanonicalSteps(payload: SaveRunRequest): RunStepDetail[] {
  if (
    payload.steps.length > 0 &&
    payload.steps.every((step): step is SaveRunStepInput => "articleTitle" in step)
  ) {
    return payload.steps.map((step, index) => ({
      stepIndex: step.stepIndex ?? index,
      articleTitle: step.articleTitle,
      normalizedArticleTitle: step.normalizedArticleTitle || normalizeWikiTitle(step.articleTitle),
      elapsedMs: step.elapsedMs,
      articleUrl: step.articleUrl,
      visitedAtIso: step.visitedAtIso,
      kind: step.kind ?? stepKindForIndex(payload, index),
    }));
  }

  const legacySteps = payload.steps as LegacyRunTransitionStep[];
  return payload.route.map((articleTitle, index) => ({
    stepIndex: index,
    articleTitle,
    normalizedArticleTitle: normalizeWikiTitle(articleTitle),
    elapsedMs: index === 0 ? 0 : legacySteps[index - 1]?.clickedAtOffsetMs ?? 0,
    kind: stepKindForIndex(payload, index),
  }));
}

function stepKindForIndex(payload: SaveRunRequest, index: number): RunStepDetail["kind"] {
  if (index === 0) {
    return "start";
  }
  if (payload.completed !== false && index === payload.route.length - 1) {
    return "target";
  }
  return "intermediate";
}

function validateAbandonedRunShape(payload: SaveRunRequest, canonicalSteps: RunStepDetail[]): void {
  if (payload.completed) {
    throw new ApiError(400, "INVALID_RUN_STATUS", "Abandoned run submissions must set completed to false");
  }
  if (payload.finalElapsedMs < 0 || payload.clickCount < 0 || payload.route.length < 1) {
    throw new ApiError(400, "INVALID_RUN_PAYLOAD", "Invalid abandoned run payload");
  }
  if (canonicalSteps.length !== payload.route.length) {
    throw new ApiError(400, "INVALID_STEPS", "Run steps must include exactly one step per route article");
  }
  const expectedClickCount = payload.route.length - 1;
  if (payload.clickCount !== expectedClickCount) {
    throw new ApiError(400, "INVALID_CLICK_COUNT", `clickCount must match route transitions (${expectedClickCount})`);
  }
  for (let index = 0; index < canonicalSteps.length; index += 1) {
    const step = canonicalSteps[index];
    if (step.stepIndex !== index) {
      throw new ApiError(400, "INVALID_STEP_INDEX", "Run steps must be sequential and zero-indexed");
    }
    if (normalizeWikiTitle(step.articleTitle) !== normalizeWikiTitle(payload.route[index])) {
      throw new ApiError(400, "ROUTE_STEP_MISMATCH", "Run steps must align with the submitted route");
    }
    if (index > 0 && step.elapsedMs < canonicalSteps[index - 1].elapsedMs) {
      throw new ApiError(400, "INVALID_ELAPSED_MS", "Step elapsedMs must be non-decreasing");
    }
  }
}

function validateRunShape(payload: SaveRunRequest, canonicalSteps: RunStepDetail[]): void {
  if (!payload.completed) {
    throw new ApiError(400, "INVALID_RUN_STATUS", "Only completed runs can be persisted by this endpoint");
  }
  if (payload.finalElapsedMs <= 0 || payload.clickCount < 0 || payload.route.length < 2) {
    throw new ApiError(400, "INVALID_RUN_PAYLOAD", "Invalid run submission payload");
  }
  if (canonicalSteps.length !== payload.route.length) {
    throw new ApiError(400, "INVALID_STEPS", "Run steps must include exactly one step per route article");
  }
  const expectedClickCount = payload.route.length - 1;
  if (payload.clickCount !== expectedClickCount) {
    throw new ApiError(400, "INVALID_CLICK_COUNT", `clickCount must match route transitions (${expectedClickCount})`);
  }
  for (let index = 0; index < canonicalSteps.length; index += 1) {
    const step = canonicalSteps[index];
    if (step.stepIndex !== index) {
      throw new ApiError(400, "INVALID_STEP_INDEX", "Run steps must be sequential and zero-indexed");
    }
    if (normalizeWikiTitle(step.articleTitle) !== normalizeWikiTitle(payload.route[index])) {
      throw new ApiError(400, "ROUTE_STEP_MISMATCH", "Run steps must align with the submitted route");
    }
    if (index > 0 && step.elapsedMs < canonicalSteps[index - 1].elapsedMs) {
      throw new ApiError(400, "INVALID_ELAPSED_MS", "Step elapsedMs must be non-decreasing");
    }
  }
}

async function resolvePersistedChallenge(payload: SaveRunRequest) {
  const wikiModeId = getWikiModeId(payload.wikiMode);
  const snapshot = payload.challengeSnapshot
    ? {
        label: payload.challengeSnapshot.label,
        startTitle: payload.challengeSnapshot.startTitle,
        targetTitle: payload.challengeSnapshot.targetTitle,
        difficultyScore: payload.challengeSnapshot.difficultyScore,
        shortestPathHint: payload.challengeSnapshot.shortestPathHint,
      }
    : undefined;

  return resolveChallengeForRun({
    challengeId: payload.challengeId,
    wikiModeId,
    snapshot,
  });
}

export async function saveCompletedRun(payload: SaveRunRequest): Promise<SaveRunResponse> {
  const canonicalSteps = asCanonicalSteps(payload);
  validateRunShape(payload, canonicalSteps);
  const wikiModeId = getWikiModeId(payload.wikiMode);
  const wikiScope = getWikiModeConfig(wikiModeId).eloScope;

  const challenge = await resolvePersistedChallenge(payload);
  await validateCompletedRoute({
    challengeStartTitle: challenge.startTitle,
    challengeTargetTitle: challenge.targetTitle,
    route: payload.route,
    wikiId: wikiModeId,
    steps: payload.route.slice(1).map((toTitle, index) => ({
      fromTitle: payload.route[index],
      toTitle,
      clickedAtOffsetMs: canonicalSteps[index + 1].elapsedMs,
    })),
  });

  const user = await ensureUser(payload.userId ?? undefined);
  const score = computeRunScore(payload.finalElapsedMs, payload.clickCount);
  const completedAt = payload.completedAt ? new Date(payload.completedAt) : new Date();
  const startedAt = payload.startedAt ? new Date(payload.startedAt) : new Date(completedAt.getTime() - payload.finalElapsedMs);

  const run = await saveRun({
    userId: user.id,
    challengeId: challenge.id,
    wikiMode: wikiModeId,
    status: "COMPLETED",
    durationMs: payload.finalElapsedMs,
    clickCount: payload.clickCount,
    score,
    startedAt,
    finishedAt: completedAt,
    eloDelta: 0,
    routeSteps: canonicalSteps,
  });

  const eloDelta = await applySoloMatchElo({
    userId: user.id,
    scope: wikiScope,
    completed: true,
    durationMs: payload.finalElapsedMs,
    clickCount: payload.clickCount,
    runId: run.id,
  });
  await refreshLeaderboardStatsForScope(user.id, wikiScope);

  return { run: { ...run, eloDelta } };
}

export async function saveAbandonedRun(payload: SaveRunRequest): Promise<SaveRunResponse> {
  const canonicalSteps = asCanonicalSteps(payload);
  validateAbandonedRunShape(payload, canonicalSteps);
  const wikiModeId = getWikiModeId(payload.wikiMode);
  const wikiScope = getWikiModeConfig(wikiModeId).eloScope;
  const challenge = await resolvePersistedChallenge(payload);

  const user = await ensureUser(payload.userId ?? undefined);
  const finishedAt = payload.completedAt ? new Date(payload.completedAt) : new Date();
  const startedAt = payload.startedAt ? new Date(payload.startedAt) : new Date(finishedAt.getTime() - payload.finalElapsedMs);

  const run = await saveRun({
    userId: user.id,
    challengeId: challenge.id,
    wikiMode: wikiModeId,
    status: "ABANDONED",
    durationMs: payload.finalElapsedMs,
    clickCount: payload.clickCount,
    score: 0,
    startedAt,
    finishedAt,
    eloDelta: 0,
    routeSteps: canonicalSteps,
  });

  const eloDelta = await applySoloMatchElo({
    userId: user.id,
    scope: wikiScope,
    completed: false,
    durationMs: payload.finalElapsedMs,
    clickCount: payload.clickCount,
    runId: run.id,
  });
  await refreshLeaderboardStatsForScope(user.id, wikiScope);

  return { run: { ...run, eloDelta } };
}

function fromLegacyPayload(payload: RunSubmissionRequest): SaveRunRequest {
  const completed = payload.completed !== false;
  const hasCanonicalSteps =
    payload.steps.length > 0 && payload.steps.every((step): step is SaveRunStepInput => "articleTitle" in step);
  const request: SaveRunRequest = {
    challengeId: payload.challengeId,
    wikiMode: payload.wikiMode ?? payload.wikiId ?? payload.challengeSnapshot?.wikiId,
    userId: payload.userId,
    completed,
    finalElapsedMs: payload.durationMs,
    clickCount: payload.clickCount,
    route: payload.route,
    difficultyScore: payload.challengeSnapshot?.difficultyScore,
    challengeSnapshot: payload.challengeSnapshot
      ? {
          label: payload.challengeSnapshot.label,
          startTitle: payload.challengeSnapshot.startTitle,
          targetTitle: payload.challengeSnapshot.targetTitle,
          difficultyScore: payload.challengeSnapshot.difficultyScore,
        }
      : undefined,
    steps: hasCanonicalSteps
      ? payload.steps
      : payload.route.map((articleTitle, index) => {
          const previousStep = payload.steps[index - 1];
          return {
            stepIndex: index,
            articleTitle,
            normalizedArticleTitle: normalizeWikiTitle(articleTitle),
            elapsedMs:
              index === 0
                ? 0
                : previousStep && "clickedAtOffsetMs" in previousStep
                  ? previousStep.clickedAtOffsetMs
                  : 0,
            kind: index === 0 ? "start" : completed && index === payload.route.length - 1 ? "target" : "intermediate",
          };
        }),
  };
  return request;
}

function makeInMemoryRun(payload: RunSubmissionRequest): RunDetail {
  const now = new Date();
  const completed = payload.completed !== false;
  const score = completed ? computeRunScore(payload.durationMs, payload.clickCount) : 0;
  const difficultyScore = payload.challengeSnapshot?.difficultyScore ?? 60;
  const startArticleTitle = payload.challengeSnapshot?.startTitle ?? payload.route[0] ?? "Unknown";
  const targetArticleTitle = payload.challengeSnapshot?.targetTitle ?? "Unknown";

  const steps = payload.route.map((articleTitle, index) => {
    const previousStep = payload.steps[index - 1];
    const canonicalStep = payload.steps[index];
    return {
      stepIndex: index,
      articleTitle,
      normalizedArticleTitle: normalizeWikiTitle(articleTitle),
      elapsedMs: index === 0 ? 0 : previousStep && "clickedAtOffsetMs" in previousStep ? previousStep.clickedAtOffsetMs : 0,
      visitedAtIso: canonicalStep && "visitedAtIso" in canonicalStep ? canonicalStep.visitedAtIso : undefined,
      kind: index === 0 ? "start" : completed && index === payload.route.length - 1 ? "target" : "intermediate",
    };
  }) satisfies RunStepDetail[];
  const routePath: RoutePathData = {
    version: "route_path_v1",
    nodes: steps.map((step) => ({
      stepIndex: step.stepIndex,
      articleTitle: step.articleTitle,
      normalizedArticleTitle: step.normalizedArticleTitle,
      elapsedMs: step.elapsedMs,
      visitedAtIso: step.visitedAtIso,
    })),
  };

  const localRun: RunDetail = {
    id: `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    challengeId: payload.challengeId,
    challengeLabel: payload.challengeSnapshot?.label ?? "Local Solo Challenge",
    wikiMode: getWikiModeId(payload.wikiMode ?? payload.wikiId ?? payload.challengeSnapshot?.wikiId),
    userId: payload.userId ?? "local-user",
    username: payload.userId ?? "local_runner",
    status: completed ? "COMPLETED" : "ABANDONED",
    finalElapsedMs: payload.durationMs,
    clickCount: payload.clickCount,
    score,
    difficultyScore,
    route: payload.route,
    completedAt: now.toISOString(),
    startedAt: new Date(now.getTime() - payload.durationMs).toISOString(),
    createdAt: now.toISOString(),
    startArticleTitle,
    targetArticleTitle,
    eloDelta: calculateSoloEloDelta({
      completed,
      timeMs: payload.durationMs,
      clicks: payload.clickCount,
    }),
    steps,
    routePath,
  };

  inMemoryRuns.set(localRun.id, localRun);
  return localRun;
}

export async function submitRun(payload: RunSubmissionRequest): Promise<RunDetail> {
  const challengeStartTitle = payload.challengeSnapshot?.startTitle;
  const challengeTargetTitle = payload.challengeSnapshot?.targetTitle;
  const wikiModeId = getWikiModeId(payload.wikiMode ?? payload.wikiId ?? payload.challengeSnapshot?.wikiId);
  const completed = payload.completed !== false;
  const saveRequest = fromLegacyPayload(payload);

  try {
    if (completed && challengeStartTitle && challengeTargetTitle) {
      const transitionSteps: Array<{ fromTitle: string; toTitle: string; clickedAtOffsetMs: number }> =
        payload.steps.length > 0 && payload.steps.every((step): step is SaveRunStepInput => "articleTitle" in step)
          ? payload.route.slice(1).map((toTitle, index) => {
              const canonicalStep = payload.steps[index + 1] as SaveRunStepInput | undefined;
              return {
                fromTitle: payload.route[index],
                toTitle,
                clickedAtOffsetMs: canonicalStep?.elapsedMs ?? 0,
              };
            })
          : (payload.steps as Array<{ fromTitle: string; toTitle: string; clickedAtOffsetMs: number }>);
      await validateCompletedRoute({
        challengeStartTitle,
        challengeTargetTitle,
        wikiId: wikiModeId,
        route: payload.route,
        steps: transitionSteps,
      });
    }

    const response = completed ? await saveCompletedRun(saveRequest) : await saveAbandonedRun(saveRequest);
    return response.run;
  } catch (error) {
    if (!challengeStartTitle || !challengeTargetTitle) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        400,
        "CHALLENGE_CONTEXT_REQUIRED",
        "challengeSnapshot.startTitle and challengeSnapshot.targetTitle are required for non-persisted challenges",
      );
    }

    if (!isDatabaseConfigured() || isPrismaConfigError(error)) {
      return makeInMemoryRun(payload);
    }

    if (error instanceof ApiError) {
      throw error;
    }

    throw error;
  }
}

export async function fetchRunById(runId: string): Promise<RunDetail> {
  const inMemoryRun = inMemoryRuns.get(runId);
  if (inMemoryRun) {
    return inMemoryRun;
  }

  return getRunById(runId);
}

export async function getRecentMatchHistory(filters: MatchHistoryFilters) {
  return getRecentRuns(filters);
}

export async function getRunsForUserHistory(userId: string, limit?: number) {
  return getRunsForUser(userId, limit);
}

export async function getRunsForChallengeHistory(challengeId: string, limit?: number) {
  return getRunsForChallenge(challengeId, limit);
}
