import { getDailyChallenges } from "@/features/challenges/services/challenge-service";
import { asApiError } from "@/server/errors/api-error";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const dailySet = await getDailyChallenges();
    return NextResponse.json(dailySet);
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
