import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/server/errors/api-error";
import type { MatchHistoryFilters, RoutePathData, RoutePathNode, RunDetail, RunHistoryItem, RunStepDetail } from "@/server/types/run-history";
import { normalizeWikiTitle } from "@/server/services/wiki/title-normalization";
import { ensureArticleRecord } from "./wiki-repository";

interface SaveRunInput {
  challengeId: string;
  userId: string;
  wikiMode: string;
  status: "COMPLETED" | "ABANDONED" | "DISQUALIFIED";
  durationMs: number;
  clickCount: number;
  score: number;
  eloDelta: number;
  startedAt: Date;
  finishedAt: Date;
  routeSteps: RunStepDetail[];
}

type RunWithRelations = Awaited<ReturnType<typeof fetchRunRecordById>>;

function isRoutePathNode(value: unknown): value is RoutePathNode {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.stepIndex === "number" &&
    Number.isInteger(candidate.stepIndex) &&
    candidate.stepIndex >= 0 &&
    typeof candidate.articleTitle === "string" &&
    candidate.articleTitle.trim().length > 0 &&
    typeof candidate.normalizedArticleTitle === "string" &&
    candidate.normalizedArticleTitle.trim().length > 0 &&
    typeof candidate.elapsedMs === "number" &&
    Number.isInteger(candidate.elapsedMs) &&
    candidate.elapsedMs >= 0 &&
    (candidate.visitedAtIso === undefined || typeof candidate.visitedAtIso === "string") &&
    (candidate.articleUrl === undefined || typeof candidate.articleUrl === "string") &&
    (candidate.wikipediaPageId === undefined || (typeof candidate.wikipediaPageId === "number" && Number.isInteger(candidate.wikipediaPageId)))
  );
}

function parseRoutePathData(rawTimelineJson: Prisma.JsonValue | null): RoutePathData | null {
  if (!rawTimelineJson || typeof rawTimelineJson !== "object" || Array.isArray(rawTimelineJson)) {
    return null;
  }
  const value = rawTimelineJson as Record<string, unknown>;
  if (value.version !== "route_path_v1" || !Array.isArray(value.nodes)) {
    return null;
  }
  if (!value.nodes.every(isRoutePathNode)) {
    return null;
  }

  const nodes = value.nodes as RoutePathNode[];
  for (let index = 0; index < nodes.length; index += 1) {
    if (nodes[index].stepIndex !== index) {
      return null;
    }
    if (index > 0 && nodes[index].elapsedMs < nodes[index - 1].elapsedMs) {
      return null;
    }
  }

  return {
    version: "route_path_v1",
    nodes,
  };
}

function runStepsFromTransitions(
  transitions: Array<{
  sequence: number;
  clickedAtOffsetMs: number;
  fromArticle: { title: string; normalizedTitle: string; url: string };
  toArticle: { title: string; normalizedTitle: string; url: string };
}>,
  status: RunDetail["status"],
): RunStepDetail[] {
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
    visitedAtIso: undefined,
    kind: index === 0 ? "start" : status === "COMPLETED" && index === routeNodes.length - 1 ? "target" : "intermediate",
  }));
}

function runStepsFromRoutePath(routePath: RoutePathData, status: RunDetail["status"]): RunStepDetail[] {
  return routePath.nodes.map((node, index) => ({
    stepIndex: node.stepIndex,
    articleTitle: node.articleTitle,
    normalizedArticleTitle: node.normalizedArticleTitle,
    elapsedMs: node.elapsedMs,
    articleUrl: node.articleUrl,
    visitedAtIso: node.visitedAtIso,
    kind: index === 0 ? "start" : status === "COMPLETED" && index === routePath.nodes.length - 1 ? "target" : "intermediate",
  }));
}

function buildRoutePathData(input: SaveRunInput, articleRecordMap: Map<string, Awaited<ReturnType<typeof ensureArticleRecord>>>): RoutePathData {
  return {
    version: "route_path_v1",
    nodes: input.routeSteps.map((step, index) => {
      const articleRecord = articleRecordMap.get(normalizeWikiTitle(step.articleTitle));
      if (!articleRecord) {
        throw new ApiError(500, "ARTICLE_MAPPING_ERROR", "Failed to map route articles for route path persistence");
      }

      return {
        stepIndex: index,
        articleTitle: articleRecord.title,
        normalizedArticleTitle: articleRecord.normalizedTitle,
        articleUrl: articleRecord.url,
        wikipediaPageId: articleRecord.wikipediaPageId ?? undefined,
        elapsedMs: step.elapsedMs,
        visitedAtIso: step.visitedAtIso ?? new Date(input.startedAt.getTime() + step.elapsedMs).toISOString(),
      };
    }),
  };
}

function toRunHistoryItem(run: NonNullable<RunWithRelations>): RunHistoryItem {
  const routePath = parseRoutePathData(run.replayMetadata?.timelineJson ?? null);
  const runSteps = routePath ? runStepsFromRoutePath(routePath, run.status) : runStepsFromTransitions(run.steps, run.status);
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
    eloDelta: run.eloDelta,
    difficultyScore: run.challenge.difficultyScore,
    route,
    completedAt: run.finishedAt.toISOString(),
  };
}

function toRunDetail(run: NonNullable<RunWithRelations>): RunDetail {
  const historyItem = toRunHistoryItem(run);
  const routePath =
    parseRoutePathData(run.replayMetadata?.timelineJson ?? null) ?? {
      version: "route_path_v1",
      nodes: runStepsFromTransitions(run.steps, run.status).map((step) => ({
        stepIndex: step.stepIndex,
        articleTitle: step.articleTitle,
        normalizedArticleTitle: step.normalizedArticleTitle,
        articleUrl: step.articleUrl,
        elapsedMs: step.elapsedMs,
        visitedAtIso: step.visitedAtIso,
      })),
    };
  const steps = runStepsFromRoutePath(routePath, run.status);

  return {
    ...historyItem,
    startedAt: run.startedAt.toISOString(),
    createdAt: run.createdAt.toISOString(),
    completedAt: run.finishedAt.toISOString(),
    startArticleTitle: run.challenge.startArticle.title,
    targetArticleTitle: run.challenge.targetArticle.title,
    steps,
    routePath,
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
          fromArticle: { select: { title: true, normalizedTitle: true, url: true, wikipediaPageId: true } },
          toArticle: { select: { title: true, normalizedTitle: true, url: true, wikipediaPageId: true } },
        },
        orderBy: { sequence: "asc" },
      },
      replayMetadata: {
        select: {
          timelineJson: true,
        },
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

  const routePath = buildRoutePathData(input, articleRecordMap);

  const run = await prisma.run.create({
    data: {
      userId: input.userId,
      challengeId: input.challengeId,
      wikiMode: input.wikiMode,
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
      replayMetadata: {
        create: {
          timelineJson: routePath as unknown as Prisma.InputJsonValue,
          eventCount: routePath.nodes.length,
        },
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
          fromArticle: { select: { title: true, normalizedTitle: true, url: true, wikipediaPageId: true } },
          toArticle: { select: { title: true, normalizedTitle: true, url: true, wikipediaPageId: true } },
        },
        orderBy: { sequence: "asc" },
      },
      replayMetadata: {
        select: {
          timelineJson: true,
        },
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
          fromArticle: { select: { title: true, normalizedTitle: true, url: true, wikipediaPageId: true } },
          toArticle: { select: { title: true, normalizedTitle: true, url: true, wikipediaPageId: true } },
        },
        orderBy: { sequence: "asc" },
      },
      replayMetadata: {
        select: {
          timelineJson: true,
        },
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
