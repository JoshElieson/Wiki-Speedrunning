import { fetchArticleByTitle } from "@/server/services/wiki/wikipedia-service";
import { asApiError } from "@/server/errors/api-error";
import { wikiArticleQuerySchema } from "@/server/validation/api-schemas";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parseResult = wikiArticleQuerySchema.safeParse({
      title: searchParams.get("title"),
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

    const article = await fetchArticleByTitle(parseResult.data.title);
    return NextResponse.json(article);
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
