import { NextResponse } from "next/server";
import { asApiError } from "@/server/errors/api-error";
import { getNextGeneratedChallengeForWiki } from "@/server/services/challenge-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const challenge = await getNextGeneratedChallengeForWiki(searchParams.get("mode") ?? searchParams.get("wikiId"));
    return NextResponse.json(challenge);
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
