import { getSession } from "@/lib/session";
import { DEFAULT_LEADERBOARD_SCOPE } from "@/lib/leaderboard-scopes";
import { asApiError } from "@/server/errors/api-error";
import { fetchLeaderboard, fetchViewerLeaderboardStats } from "@/server/services/leaderboard-service";
import type { LeaderboardResponse } from "@/server/types/api";
import { leaderboardQuerySchema } from "@/server/validation/api-schemas";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = leaderboardQuerySchema.safeParse({
      scope: searchParams.get("scope") ?? DEFAULT_LEADERBOARD_SCOPE,
      limit: searchParams.get("limit") ?? 100,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_QUERY",
            message: "Invalid leaderboard query parameters",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const [rows, session] = await Promise.all([
      fetchLeaderboard(parsed.data.scope, parsed.data.limit),
      getSession(),
    ]);

    const payload: LeaderboardResponse = { rows };

    if (session?.user?.id) {
      payload.viewer = await fetchViewerLeaderboardStats(session.user.id, parsed.data.scope);
    }

    return NextResponse.json(payload);
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
