import { asApiError } from "@/server/errors/api-error";
import { validateMove } from "@/server/services/race/route-validation-service";
import { validateMoveBodySchema } from "@/server/validation/api-schemas";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = validateMoveBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_MOVE_PAYLOAD",
            message: "Move validation payload is invalid",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const result = await validateMove(parsed.data.currentTitle, parsed.data.nextTitle, parsed.data.targetTitle, parsed.data.wikiId);
    return NextResponse.json(result);
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
