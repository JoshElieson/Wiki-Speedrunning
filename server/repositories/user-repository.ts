import { prisma } from "@/lib/prisma";
import { ensureDefaultRatings } from "@/server/services/rating-service";

const DEFAULT_USER_ID = "seed-user-guest";
const DEFAULT_USERNAME = "guest_runner";

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

export async function ensureUser(userId?: string) {
  if (userId) {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (existing) {
      return existing;
    }
  }

  const existingGuest = await prisma.user.findUnique({ where: { username: DEFAULT_USERNAME } });
  if (existingGuest) {
    return existingGuest;
  }

  return prisma.user.create({
    data: {
      id: DEFAULT_USER_ID,
      username: DEFAULT_USERNAME,
      displayName: "Guest Runner",
    },
  });
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
