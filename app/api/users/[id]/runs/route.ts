import { asApiError, ApiError } from "@/server/errors/api-error";
import { getRunsForUserHistory } from "@/server/services/run-service";
import { runHistoryFiltersSchema } from "@/server/validation/api-schemas";
import { NextResponse } from "next/server";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!id?.trim()) {
      throw new ApiError(400, "INVALID_USER_ID", "A user id is required");
    }

    const url = new URL(request.url);
    const filtersResult = runHistoryFiltersSchema.safeParse({
      limit: url.searchParams.get("limit") ?? undefined,
    });
    if (!filtersResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_RUN_FILTERS",
            message: "Invalid run history filters",
            details: filtersResult.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const runs = await getRunsForUserHistory(id, filtersResult.data.limit);
    return NextResponse.json({ userId: id, runs });
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
