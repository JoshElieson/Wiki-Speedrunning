import { getDummyProfileSnapshot } from "@/lib/dummy-players";
import { DEFAULT_ELO } from "@/lib/elo";
import {
  PROFILE_VARIETY_CATEGORIES,
  PROFILE_VARIETY_SCOPES,
  WIKIPEDIA_ELO_SCOPE,
} from "@/lib/profile-elo-categories";
import { prisma } from "@/lib/prisma";
import { asApiError, ApiError } from "@/server/errors/api-error";
import { getRunsForUserHistory } from "@/server/services/run-service";
import { getUserByUsername } from "@/server/repositories/user-repository";
import type { ProfileSnapshot } from "@/types/domain";
import { NextResponse } from "next/server";

export async function GET(_: Request, context: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await context.params;
    if (!username?.trim()) {
      throw new ApiError(400, "INVALID_USERNAME", "Username is required");
    }

    const dummyProfile = getDummyProfileSnapshot(username);
    if (dummyProfile) {
      return NextResponse.json(dummyProfile);
    }

    const user = await getUserByUsername(username);
    if (!user) {
      throw new ApiError(404, "USER_NOT_FOUND", "User not found");
    }

    const [runs, ratingRow, categoryRatingRows, totalRuns] = await Promise.all([
      getRunsForUserHistory(user.id, 100),
      prisma.leaderboardEntry.findFirst({
        where: { userId: user.id, scope: WIKIPEDIA_ELO_SCOPE },
        select: { rating: true },
      }),
      prisma.leaderboardEntry.findMany({
        where: { userId: user.id, scope: { in: [...PROFILE_VARIETY_SCOPES] } },
        select: { scope: true, rating: true },
      }),
      prisma.run.count({ where: { userId: user.id } }),
    ]);

    const categoryRatingsByScope = new Map(categoryRatingRows.map((row) => [row.scope, row.rating]));
    const completedRuns = runs.filter((run) => run.status === "COMPLETED");
    const bestTimeMs =
      completedRuns.length > 0 ? Math.min(...completedRuns.map((run) => run.finalElapsedMs)) : 0;
    const profile: ProfileSnapshot = {
      username: user.username,
      displayName: user.displayName ?? user.username,
      avatarUrl: user.avatarUrl ?? null,
      rating: ratingRow?.rating ?? DEFAULT_ELO,
      categoryElos: PROFILE_VARIETY_CATEGORIES.map((category) => ({
        scope: category.scope,
        label: category.label,
        rating: categoryRatingsByScope.get(category.scope) ?? DEFAULT_ELO,
      })),
      bestTimeMs,
      totalRuns,
      wins: 0,
      recentRuns: runs.map((run) => ({
        id: run.id,
        challengeLabel: run.challengeLabel,
        status: run.status,
        durationMs: run.finalElapsedMs,
        clickCount: run.clickCount,
        score: run.score,
        difficultyScore: run.difficultyScore,
        route: run.route,
        createdAt: run.completedAt,
      })),
    };

    return NextResponse.json(profile);
  } catch (error) {
    const apiError = asApiError(error);
    return NextResponse.json(
      {
        error: {
          code: apiError.code,
          message: apiError.message,
          details: apiError.details,
        },
      },
      { status: apiError.statusCode },
    );
  }
}
