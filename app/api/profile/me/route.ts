import { getSession } from "@/lib/session";
import { asApiError, ApiError } from "@/server/errors/api-error";
import { updateUserProfile } from "@/server/repositories/user-repository";
import { updateProfileBodySchema } from "@/server/validation/api-schemas";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      throw new ApiError(401, "UNAUTHORIZED", "Sign in to update your profile");
    }

    const rawBody = await request.json();
    const parseResult = updateProfileBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      throw new ApiError(400, "INVALID_PROFILE_PAYLOAD", "Invalid profile payload", parseResult.error.flatten());
    }

    const avatarUrl =
      parseResult.data.avatarUrl === undefined
        ? undefined
        : parseResult.data.avatarUrl === "" || parseResult.data.avatarUrl === null
          ? null
          : parseResult.data.avatarUrl;

    const user = await updateUserProfile(session.user.id, {
      displayName: parseResult.data.displayName,
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
    });

    return NextResponse.json({
      username: user.username,
      displayName: user.displayName ?? user.username,
      avatarUrl: user.avatarUrl,
    });
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
