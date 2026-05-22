import { asApiError } from "@/server/errors/api-error";
import { fetchChallengeById } from "@/server/services/challenge-service";
import { NextResponse } from "next/server";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const challenge = await fetchChallengeById(id);
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
