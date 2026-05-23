import { asApiError } from "@/server/errors/api-error";
import { getSession } from "@/lib/session";
import { getRecentMatchHistory, submitRun } from "@/server/services/run-service";
import { runHistoryFiltersSchema, saveRunBodySchema } from "@/server/validation/api-schemas";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const parseResult = saveRunBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_RUN_PAYLOAD",
            message: "Invalid run payload",
            details: parseResult.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const elapsedMs = parseResult.data.finalElapsedMs ?? parseResult.data.durationMs ?? 0;
    const session = await getSession();
    const run = await submitRun({
      challengeId: parseResult.data.challengeId,
      wikiMode: parseResult.data.wikiMode ?? parseResult.data.challengeSnapshot?.wikiId,
      userId: session?.user?.id ?? parseResult.data.userId ?? undefined,
      completed: parseResult.data.completed !== false,
      durationMs: elapsedMs,
      clickCount: parseResult.data.clickCount,
      route: parseResult.data.route,
      steps: parseResult.data.steps,
      challengeSnapshot: parseResult.data.challengeSnapshot,
    });
    return NextResponse.json(run, { status: 201 });
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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parseResult = runHistoryFiltersSchema.safeParse({
      userId: url.searchParams.get("userId") ?? undefined,
      challengeId: url.searchParams.get("challengeId") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_RUN_FILTERS",
            message: "Invalid run history filters",
            details: parseResult.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const runs = await getRecentMatchHistory(parseResult.data);
    return NextResponse.json({ runs });
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
