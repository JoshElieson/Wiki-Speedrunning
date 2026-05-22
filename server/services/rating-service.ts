import { DEFAULT_ELO, WIKIPEDIA_ELO_DELTA } from "@/lib/elo";
import {
  PROFILE_VARIETY_SCOPES,
  WIKIPEDIA_ELO_SCOPE,
} from "@/lib/profile-elo-categories";
import { prisma } from "@/lib/prisma";

const DEFAULT_RATING_SCOPES = [WIKIPEDIA_ELO_SCOPE, ...PROFILE_VARIETY_SCOPES] as const;

async function recalculateRanks(scope: string) {
  const entries = await prisma.leaderboardEntry.findMany({
    where: { scope },
    orderBy: [{ rating: "desc" }, { updatedAt: "asc" }],
  });

  if (entries.length === 0) {
    return;
  }

  await prisma.$transaction(
    entries.map((entry, index) =>
      prisma.leaderboardEntry.update({
        where: { id: entry.id },
        data: { rank: index + 1 },
      }),
    ),
  );
}

export async function ensureDefaultRatings(userId: string) {
  const existing = await prisma.leaderboardEntry.findMany({
    where: { userId },
    select: { scope: true },
  });
  const existingScopes = new Set(existing.map((entry) => entry.scope));
  const missingScopes = DEFAULT_RATING_SCOPES.filter((scope) => !existingScopes.has(scope));

  if (missingScopes.length === 0) {
    return;
  }

  await prisma.leaderboardEntry.createMany({
    data: missingScopes.map((scope) => ({
      userId,
      scope,
      rank: 0,
      rating: DEFAULT_ELO,
    })),
    skipDuplicates: true,
  });

  await Promise.all(missingScopes.map((scope) => recalculateRanks(scope)));
}

export async function applyWikipediaMatchElo(userId: string, outcome: "completed" | "abandoned") {
  await ensureDefaultRatings(userId);

  const delta = outcome === "completed" ? WIKIPEDIA_ELO_DELTA : -WIKIPEDIA_ELO_DELTA;
  const context = outcome === "completed" ? "wikipedia_match_completed" : "wikipedia_match_abandoned";

  const entry = await prisma.leaderboardEntry.findUnique({
    where: {
      scope_userId: {
        scope: WIKIPEDIA_ELO_SCOPE,
        userId,
      },
    },
  });

  if (!entry) {
    return;
  }

  const ratingBefore = entry.rating;
  const ratingAfter = Math.max(0, ratingBefore + delta);
  const appliedDelta = ratingAfter - ratingBefore;

  if (appliedDelta === 0) {
    return;
  }

  await prisma.$transaction([
    prisma.leaderboardEntry.update({
      where: { id: entry.id },
      data: { rating: ratingAfter },
    }),
    prisma.ratingRecord.create({
      data: {
        userId,
        ratingBefore,
        ratingAfter,
        delta: appliedDelta,
        context,
      },
    }),
  ]);

  await recalculateRanks(WIKIPEDIA_ELO_SCOPE);
}
