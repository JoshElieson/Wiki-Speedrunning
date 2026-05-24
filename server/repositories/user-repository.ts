import {
  guestUsernameSuffix,
  isGuestAccount,
  isValidGuestClientId,
} from "@/lib/guest-user";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/server/errors/api-error";
import { ensureDefaultRatings } from "@/server/services/rating-service";

function slugifyUsername(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);

  return slug.length > 0 ? slug : "runner";
}

async function generateUniqueUsername(seed: string) {
  const base = slugifyUsername(seed);
  let candidate = base;
  let suffix = 0;

  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    suffix += 1;
    candidate = `${base}_${suffix}`;
  }

  return candidate;
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function upsertOAuthUser(params: {
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}) {
  const existing = await getUserByEmail(params.email);
  if (existing) {
    await ensureDefaultRatings(existing.id);
    return existing;
  }

  const usernameSeed = params.displayName ?? params.email.split("@")[0] ?? "runner";
  const username = await generateUniqueUsername(usernameSeed);

  const user = await prisma.user.create({
    data: {
      email: params.email,
      username,
      displayName: params.displayName ?? username,
      avatarUrl: params.avatarUrl,
    },
  });
  await ensureDefaultRatings(user.id);
  return user;
}

export async function ensureGuestUser(clientGuestId: string) {
  const guestId = clientGuestId.trim();
  if (!isValidGuestClientId(guestId)) {
    throw new ApiError(400, "INVALID_GUEST_ID", "Guest profile id is invalid");
  }

  const existing = await prisma.user.findUnique({ where: { id: guestId } });
  if (existing) {
    if (!isGuestAccount(existing)) {
      throw new ApiError(403, "GUEST_ID_NOT_ALLOWED", "Guest profile id is not allowed");
    }
    await ensureDefaultRatings(existing.id);
    return existing;
  }

  const suffix = guestUsernameSuffix(guestId);
  const username = await generateUniqueUsername(`guest_${suffix}`);
  const guest = await prisma.user.create({
    data: {
      id: guestId,
      username,
      displayName: `Guest ${suffix}`,
    },
  });
  await ensureDefaultRatings(guest.id);
  return guest;
}

export async function resolveUserForRun(params: {
  sessionUserId?: string | null;
  clientUserId?: string | null;
}) {
  const sessionUserId = params.sessionUserId?.trim();
  if (sessionUserId) {
    const user = await prisma.user.findUnique({ where: { id: sessionUserId } });
    if (!user) {
      throw new ApiError(401, "UNAUTHORIZED", "Signed-in user was not found");
    }
    await ensureDefaultRatings(user.id);
    return user;
  }

  const clientUserId = params.clientUserId?.trim();
  if (!clientUserId) {
    throw new ApiError(400, "GUEST_ID_REQUIRED", "Guest profile id is required when not signed in");
  }

  return ensureGuestUser(clientUserId);
}

export async function getUserById(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function getUserByUsername(username: string) {
  return prisma.user.findUnique({ where: { username } });
}

export async function updateUserProfile(
  userId: string,
  data: {
    displayName?: string;
    avatarUrl?: string | null;
  },
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
      ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
    },
  });
}
