import { asApiError, ApiError } from "@/server/errors/api-error";
import { getRunsForUserHistory } from "@/server/services/run-service";
import { buildProfileSnapshot, loadProfileStatsForUser } from "@/server/services/profile-stats-service";
import { ensureDefaultRatings } from "@/server/services/rating-service";
import { getUserByUsername } from "@/server/repositories/user-repository";
import { NextResponse } from "next/server";

export async function GET(_: Request, context: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await context.params;
    if (!username?.trim()) {
      throw new ApiError(400, "INVALID_USERNAME", "Username is required");
    }

    const user = await getUserByUsername(username);
    if (!user) {
      throw new ApiError(404, "USER_NOT_FOUND", "User not found");
    }

    await ensureDefaultRatings(user.id);

    const [runs, profileStats] = await Promise.all([
      getRunsForUserHistory(user.id, 100),
      loadProfileStatsForUser(user.id),
    ]);

    const profile = buildProfileSnapshot({
      username: user.username,
      displayName: user.displayName ?? user.username,
      avatarUrl: user.avatarUrl ?? null,
      ratingEntries: profileStats.ratingEntries,
      runAggregates: profileStats.runAggregates,
      totalRuns: profileStats.totalRuns,
      recentRuns: runs,
    });

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
