import { getWikiModeId } from "@/lib/wiki-modes";
import { getEnabledWikiModeServerAdapter } from "@/lib/wiki-modes/server/registry";
import { asApiError } from "@/server/errors/api-error";
import { wikiArticleQuerySchema } from "@/server/validation/api-schemas";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parseResult = wikiArticleQuerySchema.safeParse({
      title: searchParams.get("title") ?? undefined,
      mode: searchParams.get("mode") ?? undefined,
      wikiId: searchParams.get("wikiId") ?? undefined,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_QUERY",
            message: "Invalid request query",
            details: parseResult.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const wikiId = getWikiModeId(parseResult.data.mode ?? parseResult.data.wikiId);
    const adapter = getEnabledWikiModeServerAdapter(wikiId);
    const article = await adapter.fetchArticleByTitle(parseResult.data.title);
    return NextResponse.json(article, {
      headers: {
        "Cache-Control": "private, max-age=300, stale-while-revalidate=600",
      },
    });
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
