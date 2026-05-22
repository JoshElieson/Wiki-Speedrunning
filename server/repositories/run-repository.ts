import { prisma } from "@/lib/prisma";
import { ApiError } from "@/server/errors/api-error";
import type { MatchHistoryFilters, RunDetail, RunHistoryItem, RunStepDetail } from "@/server/types/run-history";
import { normalizeWikiTitle } from "@/server/services/wiki/title-normalization";
import { ensureArticleRecord } from "./wiki-repository";

interface SaveRunInput {
  challengeId: string;
  userId: string;
  status: "COMPLETED" | "ABANDONED" | "DISQUALIFIED";
  durationMs: number;
  clickCount: number;
  score: number;
  startedAt: Date;
  finishedAt: Date;
  routeSteps: RunStepDetail[];
}

type RunWithRelations = Awaited<ReturnType<typeof fetchRunRecordById>>;

function runStepsFromTransitions(transitions: Array<{
  sequence: number;
  clickedAtOffsetMs: number;
  fromArticle: { title: string; normalizedTitle: string; url: string };
  toArticle: { title: string; normalizedTitle: string; url: string };
}>): RunStepDetail[] {
  if (transitions.length === 0) {
    return [];
  }

  const ordered = [...transitions].sort((a, b) => a.sequence - b.sequence);
  const routeNodes = [ordered[0].fromArticle, ...ordered.map((step) => step.toArticle)];

  return routeNodes.map((article, index) => ({
    stepIndex: index,
    articleTitle: article.title,
    normalizedArticleTitle: article.normalizedTitle,
    elapsedMs: index === 0 ? 0 : ordered[index - 1].clickedAtOffsetMs,
    articleUrl: article.url,
    kind: index === 0 ? "start" : index === routeNodes.length - 1 ? "target" : "intermediate",
  }));
}

function toRunHistoryItem(run: NonNullable<RunWithRelations>): RunHistoryItem {
  const runSteps = runStepsFromTransitions(run.steps);
  const route = runSteps.map((step) => step.articleTitle);

  return {
    id: run.id,
    challengeId: run.challengeId,
    challengeLabel: run.challenge.label,
    userId: run.user.id,
    username: run.user.username,
    status: run.status,
    finalElapsedMs: run.durationMs,
    clickCount: run.clickCount,
    score: run.score,
    difficultyScore: run.challenge.difficultyScore,
    route,
    completedAt: run.finishedAt.toISOString(),
  };
}

function toRunDetail(run: NonNullable<RunWithRelations>): RunDetail {
  const historyItem = toRunHistoryItem(run);
  const steps = runStepsFromTransitions(run.steps);

  return {
    ...historyItem,
    startedAt: run.startedAt.toISOString(),
    createdAt: run.createdAt.toISOString(),
    completedAt: run.finishedAt.toISOString(),
    startArticleTitle: run.challenge.startArticle.title,
    targetArticleTitle: run.challenge.targetArticle.title,
    steps,
  };
}

async function fetchRunRecordById(runId: string) {
  return prisma.run.findUnique({
    where: { id: runId },
    include: {
      user: { select: { id: true, username: true } },
      challenge: {
        select: {
          label: true,
          difficultyScore: true,
          startArticle: { select: { title: true } },
          targetArticle: { select: { title: true } },
        },
      },
      steps: {
        include: {
          fromArticle: { select: { title: true, normalizedTitle: true, url: true } },
          toArticle: { select: { title: true, normalizedTitle: true, url: true } },
        },
        orderBy: { sequence: "asc" },
      },
    },
  });
}

export async function saveRun(input: SaveRunInput): Promise<RunDetail> {
  const articleRecordMap = new Map<string, Awaited<ReturnType<typeof ensureArticleRecord>>>();
  for (const routeStep of input.routeSteps) {
    const normalized = normalizeWikiTitle(routeStep.articleTitle);
    if (!articleRecordMap.has(normalized)) {
      const articleRecord = await ensureArticleRecord(routeStep.articleTitle);
      articleRecordMap.set(normalized, articleRecord);
    }
  }

  const run = await prisma.run.create({
    data: {
      userId: input.userId,
      challengeId: input.challengeId,
      status: input.status,
      durationMs: input.durationMs,
      clickCount: input.clickCount,
      score: input.score,
      startedAt: input.startedAt,
      finishedAt: input.finishedAt,
      steps: {
        create: input.routeSteps.slice(0, -1).map((fromStep, index) => {
          const toStep = input.routeSteps[index + 1];
          const fromArticle = articleRecordMap.get(normalizeWikiTitle(fromStep.articleTitle));
          const toArticle = articleRecordMap.get(normalizeWikiTitle(toStep.articleTitle));
          if (!fromArticle || !toArticle) {
            throw new ApiError(500, "ARTICLE_MAPPING_ERROR", "Failed to map route articles for run steps");
          }

          return {
            sequence: index,
            fromArticleId: fromArticle.id,
            toArticleId: toArticle.id,
            linkText: toStep.articleTitle,
            clickedAtOffsetMs: toStep.elapsedMs,
          };
        }),
      },
    },
    include: {
      user: { select: { id: true, username: true } },
      challenge: {
        select: {
          label: true,
          difficultyScore: true,
          startArticle: { select: { title: true } },
          targetArticle: { select: { title: true } },
        },
      },
      steps: {
        include: {
          fromArticle: { select: { title: true, normalizedTitle: true, url: true } },
          toArticle: { select: { title: true, normalizedTitle: true, url: true } },
        },
        orderBy: { sequence: "asc" },
      },
    },
  });

  return toRunDetail(run);
}

export async function getRunById(runId: string): Promise<RunDetail> {
  const run = await fetchRunRecordById(runId);
  if (!run) {
    throw new ApiError(404, "RUN_NOT_FOUND", "Run not found");
  }
  return toRunDetail(run);
}

export async function getRecentRuns(filters: MatchHistoryFilters): Promise<RunHistoryItem[]> {
  const runs = await prisma.run.findMany({
    where: {
      userId: filters.userId,
      challengeId: filters.challengeId,
    },
    include: {
      user: { select: { id: true, username: true } },
      challenge: {
        select: {
          label: true,
          difficultyScore: true,
          startArticle: { select: { title: true } },
          targetArticle: { select: { title: true } },
        },
      },
      steps: {
        include: {
          fromArticle: { select: { title: true, normalizedTitle: true, url: true } },
          toArticle: { select: { title: true, normalizedTitle: true, url: true } },
        },
        orderBy: { sequence: "asc" },
      },
    },
    orderBy: { finishedAt: "desc" },
    take: filters.limit ?? 20,
  });

  return runs.map(toRunHistoryItem);
}

export async function getRunsForUser(userId: string, limit = 20): Promise<RunHistoryItem[]> {
  return getRecentRuns({ userId, limit });
}

export async function getRunsForChallenge(challengeId: string, limit = 20): Promise<RunHistoryItem[]> {
  return getRecentRuns({ challengeId, limit });
}
