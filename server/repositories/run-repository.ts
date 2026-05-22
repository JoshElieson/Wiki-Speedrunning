import { prisma } from "@/lib/prisma";
import { ApiError } from "@/server/errors/api-error";
import type { RunDetailResponse } from "@/server/types/api";
import type { RunStepInput } from "@/types/domain";
import { normalizeWikiTitle } from "@/server/services/wiki/title-normalization";
import { ensureArticleRecord } from "./wiki-repository";

export interface SaveRunInput {
  challengeId: string;
  userId: string;
  durationMs: number;
  clickCount: number;
  score: number;
  route: string[];
  steps: RunStepInput[];
}

function toRunDetailResponse(run: {
  id: string;
  challengeId: string;
  status: "COMPLETED" | "ABANDONED" | "DISQUALIFIED";
  durationMs: number;
  clickCount: number;
  score: number;
  createdAt: Date;
  startedAt: Date;
  finishedAt: Date;
  user: { id: string; username: string };
  challenge: { label: string };
  steps: Array<{
    sequence: number;
    clickedAtOffsetMs: number;
    fromArticle: { title: string };
    toArticle: { title: string };
  }>;
}): RunDetailResponse {
  const route: string[] = [];
  for (const step of run.steps) {
    if (route.length === 0) {
      route.push(step.fromArticle.title);
    }
    route.push(step.toArticle.title);
  }

  return {
    id: run.id,
    challengeId: run.challengeId,
    challengeLabel: run.challenge.label,
    userId: run.user.id,
    username: run.user.username,
    status: run.status,
    durationMs: run.durationMs,
    clickCount: run.clickCount,
    score: run.score,
    route,
    steps: run.steps.map((step) => ({
      sequence: step.sequence,
      fromTitle: step.fromArticle.title,
      toTitle: step.toArticle.title,
      clickedAtOffsetMs: step.clickedAtOffsetMs,
    })),
    createdAt: run.createdAt.toISOString(),
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt.toISOString(),
  };
}

export async function saveRun(input: SaveRunInput): Promise<RunDetailResponse> {
  const articleRecordMap = new Map<string, Awaited<ReturnType<typeof ensureArticleRecord>>>();
  for (const routeTitle of input.route) {
    const normalized = normalizeWikiTitle(routeTitle);
    if (!articleRecordMap.has(normalized)) {
      const articleRecord = await ensureArticleRecord(routeTitle);
      articleRecordMap.set(normalized, articleRecord);
    }
  }

  const now = new Date();
  const startedAt = new Date(now.getTime() - input.durationMs);

  const run = await prisma.run.create({
    data: {
      userId: input.userId,
      challengeId: input.challengeId,
      status: "COMPLETED",
      durationMs: input.durationMs,
      clickCount: input.clickCount,
      score: input.score,
      startedAt,
      finishedAt: now,
      steps: {
        create: input.steps.map((step, index) => {
          const fromArticle = articleRecordMap.get(normalizeWikiTitle(step.fromTitle));
          const toArticle = articleRecordMap.get(normalizeWikiTitle(step.toTitle));
          if (!fromArticle || !toArticle) {
            throw new ApiError(500, "ARTICLE_MAPPING_ERROR", "Failed to map route articles for run steps");
          }

          return {
            sequence: index,
            fromArticleId: fromArticle.id,
            toArticleId: toArticle.id,
            linkText: step.toTitle,
            clickedAtOffsetMs: step.clickedAtOffsetMs,
          };
        }),
      },
    },
    include: {
      user: { select: { id: true, username: true } },
      challenge: { select: { label: true } },
      steps: {
        include: {
          fromArticle: { select: { title: true } },
          toArticle: { select: { title: true } },
        },
        orderBy: { sequence: "asc" },
      },
    },
  });

  return toRunDetailResponse(run);
}

export async function getRunById(runId: string): Promise<RunDetailResponse> {
  const run = await prisma.run.findUnique({
    where: { id: runId },
    include: {
      user: { select: { id: true, username: true } },
      challenge: { select: { label: true } },
      steps: {
        include: {
          fromArticle: { select: { title: true } },
          toArticle: { select: { title: true } },
        },
        orderBy: { sequence: "asc" },
      },
    },
  });

  if (!run) {
    throw new ApiError(404, "RUN_NOT_FOUND", "Run not found");
  }

  return toRunDetailResponse(run);
}
