import { prisma } from "@/lib/prisma";

const DEFAULT_USER_ID = "seed-user-guest";
const DEFAULT_USERNAME = "guest_runner";

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
