import { prisma } from "@/lib/prisma";
import { ApiError } from "@/server/errors/api-error";
import type { CreateChallengeRequest } from "@/server/types/api";
import type { ChallengeDescriptor, DifficultyTier } from "@/types/domain";
import { getWikiModeId } from "@/lib/wiki-modes";
import { normalizeWikiTitle } from "@/server/services/wiki/title-normalization";
import { ensureArticleRecord } from "./wiki-repository";

function tierFromDifficulty(score: number): DifficultyTier {
  if (score < 45) return "novice";
  if (score < 65) return "intermediate";
  if (score < 80) return "advanced";
  return "expert";
}

function toChallengeDescriptor(data: {
  id: string;
  label: string;
  difficultyScore: number;
  shortestPathHint: number | null;
  dailyChallenges: Array<{ id: string }>;
  startArticle: { title: string };
  targetArticle: { title: string };
}): ChallengeDescriptor {
  return {
    id: data.id,
    label: data.label,
    startTitle: data.startArticle.title,
    targetTitle: data.targetArticle.title,
    difficultyScore: data.difficultyScore,
    difficultyTier: tierFromDifficulty(data.difficultyScore),
    shortestPathHint: data.shortestPathHint ?? undefined,
    source: data.dailyChallenges.length > 0 ? "daily" : "generated",
  };
}

export async function createChallenge(input: CreateChallengeRequest): Promise<ChallengeDescriptor> {
  const normalizedStartTitle = normalizeWikiTitle(input.startTitle);
  const normalizedTargetTitle = normalizeWikiTitle(input.targetTitle);
  const wikiId = getWikiModeId(input.wikiId);

  if (!normalizedStartTitle || !normalizedTargetTitle) {
    throw new ApiError(400, "INVALID_CHALLENGE_TITLES", "Start and target titles are required");
  }

  if (normalizedStartTitle === normalizedTargetTitle) {
    throw new ApiError(400, "INVALID_CHALLENGE_TITLES", "Start and target must be different");
  }

  const [startArticle, targetArticle] = await Promise.all([
    ensureArticleRecord(input.startTitle, wikiId),
    ensureArticleRecord(input.targetTitle, wikiId),
  ]);

  const label = input.label.trim();
  if (!label) {
    throw new ApiError(400, "INVALID_CHALLENGE_LABEL", "Challenge label is required");
  }

  const difficultyScore = input.difficultyScore ?? 60;
  const challenge = await prisma.challenge.create({
    data: {
      label,
      description: input.description?.trim() || null,
      slug: `${startArticle.normalizedTitle.toLowerCase()}-to-${targetArticle.normalizedTitle.toLowerCase()}-${Date.now()}`,
      startArticleId: startArticle.id,
      targetArticleId: targetArticle.id,
      difficultyScore,
      shortestPathHint: input.shortestPathHint ?? Math.max(2, Math.round(difficultyScore / 20)),
      seed: input.seed ?? null,
      isActive: input.isActive ?? true,
    },
    include: {
      startArticle: { select: { title: true } },
      targetArticle: { select: { title: true } },
      dailyChallenges: { select: { id: true } },
    },
  });

  return toChallengeDescriptor(challenge);
}

export async function getChallengeById(challengeId: string): Promise<ChallengeDescriptor> {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      startArticle: { select: { title: true } },
      targetArticle: { select: { title: true } },
      dailyChallenges: { select: { id: true } },
    },
  });

  if (!challenge) {
    throw new ApiError(404, "CHALLENGE_NOT_FOUND", "Challenge not found");
  }

  return toChallengeDescriptor(challenge);
}

export async function getRandomActiveChallenge(): Promise<ChallengeDescriptor | null> {
  const total = await prisma.challenge.count({ where: { isActive: true } });
  if (total === 0) {
    return null;
  }

  const randomOffset = Math.floor(Math.random() * total);
  const [challenge] = await prisma.challenge.findMany({
    where: { isActive: true },
    include: {
      startArticle: { select: { title: true } },
      targetArticle: { select: { title: true } },
      dailyChallenges: { select: { id: true } },
    },
    skip: randomOffset,
    take: 1,
    orderBy: { updatedAt: "desc" },
  });

  return challenge ? toChallengeDescriptor(challenge) : null;
}

export async function getActiveChallengeCount(): Promise<number> {
  return prisma.challenge.count({
    where: { isActive: true },
  });
}

export async function getDailyChallengeByDateKey(dateKey: string): Promise<ChallengeDescriptor | null> {
  const daily = await prisma.dailyChallenge.findUnique({
    where: { dateKey },
    include: {
      challenge: {
        include: {
          startArticle: { select: { title: true } },
          targetArticle: { select: { title: true } },
          dailyChallenges: { select: { id: true } },
        },
      },
    },
  });

  if (!daily) {
    return null;
  }

  return toChallengeDescriptor(daily.challenge);
}

export async function setDailyChallenge(dateKey: string, challengeId: string): Promise<void> {
  await prisma.dailyChallenge.upsert({
    where: { dateKey },
    create: { dateKey, challengeId },
    update: { challengeId },
  });
}
