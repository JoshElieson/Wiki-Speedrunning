import type { NextResponse } from "next/server";
import { NextResponse as Next } from "next/server";
import { ApiError, asApiError } from "@/server/errors/api-error";
import type { ApiErrorResponse, ApiSuccessResponse } from "@/server/types/api";

export function ok<T>(data: T, init?: ResponseInit): NextResponse<ApiSuccessResponse<T>> {
  return Next.json(
    {
      ok: true,
      data,
    },
    init,
  );
}

export function fail(error: unknown): NextResponse<ApiErrorResponse> {
  const apiError: ApiError = asApiError(error);
  return Next.json(
    {
      ok: false,
      error: {
        code: apiError.code,
        message: apiError.message,
        details: apiError.details,
      },
    },
    { status: apiError.statusCode },
  );
}
