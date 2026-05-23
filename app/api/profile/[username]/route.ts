import { asApiError, ApiError } from "@/server/errors/api-error";
import { fetchProfileSnapshotByUsername } from "@/server/services/profile-service";
import { NextResponse } from "next/server";

export async function GET(_: Request, context: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await context.params;
    if (!username?.trim()) {
      throw new ApiError(400, "INVALID_USERNAME", "Username is required");
    }

    const profile = await fetchProfileSnapshotByUsername(username);
    if (!profile) {
      throw new ApiError(404, "USER_NOT_FOUND", "User not found");
    }

    return NextResponse.json(profile);
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
