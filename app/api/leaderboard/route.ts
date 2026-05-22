import { asApiError } from "@/server/errors/api-error";
import { fetchLeaderboard } from "@/server/services/leaderboard-service";
import { leaderboardQuerySchema } from "@/server/validation/api-schemas";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = leaderboardQuerySchema.safeParse({
      scope: searchParams.get("scope") ?? "global",
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

    const rows = await fetchLeaderboard(parsed.data.scope, parsed.data.limit);
    return NextResponse.json({ rows });
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
