import { submitRun } from "@/server/services/run-service";
import { asApiError } from "@/server/errors/api-error";
import { submitRunBodySchema } from "@/server/validation/api-schemas";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const parseResult = submitRunBodySchema.safeParse(rawBody);
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

    const run = await submitRun(parseResult.data);
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
