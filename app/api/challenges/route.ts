import { asApiError } from "@/server/errors/api-error";
import { createChallengeRecord, fetchChallengeById, getNextGeneratedChallenge } from "@/server/services/challenge-service";
import { createChallengeBodySchema, challengeByIdQuerySchema } from "@/server/validation/api-schemas";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const challengeId = searchParams.get("id");

    if (!challengeId) {
      return NextResponse.json(await getNextGeneratedChallenge());
    }

    const parsed = challengeByIdQuerySchema.safeParse({ id: challengeId });
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_QUERY",
            message: "Challenge id query is invalid",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const challenge = await fetchChallengeById(parsed.data.id);
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createChallengeBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_CHALLENGE_PAYLOAD",
            message: "Challenge payload is invalid",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const challenge = await createChallengeRecord(parsed.data);
    return NextResponse.json(challenge, { status: 201 });
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
