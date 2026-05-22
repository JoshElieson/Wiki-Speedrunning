import { asApiError } from "@/server/errors/api-error";
import { getNextGeneratedChallenge } from "@/server/services/challenge-service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const challenge = await getNextGeneratedChallenge();
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
