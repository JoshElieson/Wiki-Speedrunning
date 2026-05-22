import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DUMMY_PLAYER_POOL_SIZE = 100;

const LEADERBOARD_SCOPES = [
  "wikipedia",
  "minecraft",
  "league",
  "pokemon",
  "star-wars",
  "marvel",
];

const USERNAME_PREFIXES = [
  "wiki",
  "link",
  "page",
  "graph",
  "route",
  "cite",
  "hop",
  "dash",
  "speed",
  "click",
];

const USERNAME_SUFFIXES = [
  "sprinter",
  "runner",
  "master",
  "hawk",
  "fox",
  "bolt",
  "ace",
  "pro",
  "knight",
  "sage",
];

const seeds = [
  { label: "Foundations", startTitle: "Internet", targetTitle: "Graph theory", difficultyScore: 42 },
  { label: "Culture Shift", startTitle: "Jazz", targetTitle: "Machine learning", difficultyScore: 58 },
  { label: "Space to Code", startTitle: "Mars", targetTitle: "TypeScript", difficultyScore: 66 },
  { label: "Policy Sprint", startTitle: "Democracy", targetTitle: "Cryptography", difficultyScore: 71 },
  { label: "Deep Dive", startTitle: "Quantum mechanics", targetTitle: "Compiler", difficultyScore: 82 },
];

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function hashString(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function scopeRating(scope, playerIndex) {
  const maxRating = 1300;
  const minRating = 50;
  const spread = DUMMY_PLAYER_POOL_SIZE - 1;
  if (playerIndex === 0) {
    return maxRating;
  }
  if (playerIndex === spread) {
    return minRating;
  }
  const slope = (maxRating - minRating) / spread;
  const baseline = Math.round(maxRating - slope * playerIndex);
  const jitter = (hashString(`${scope}:${playerIndex}`) % 61) - 30;
  return Math.max(minRating, Math.min(maxRating, baseline + jitter));
}

function buildSeedPlayers() {
  return Array.from({ length: DUMMY_PLAYER_POOL_SIZE }, (_, index) => {
    const prefix = USERNAME_PREFIXES[index % USERNAME_PREFIXES.length];
    const suffix = USERNAME_SUFFIXES[Math.floor(index / USERNAME_PREFIXES.length) % USERNAME_SUFFIXES.length];
    const username = `${prefix}${suffix}`.toLowerCase();
    const displayName = `${capitalize(prefix)} ${capitalize(suffix)}`;
    const ratingsByScope = Object.fromEntries(
      LEADERBOARD_SCOPES.map((scope) => [scope, scopeRating(scope, index)]),
    );
    const bestTimeMs = 34_000 + index * 410 + (hashString(username) % 3_800);
    const runs = Math.max(12, 210 - index * 2);

    return {
      username,
      displayName,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(username)}&size=144`,
      ratingsByScope,
      bestTimeMs,
      runs,
    };
  });
}

function buildRanksByScope(players) {
  const rankMaps = {};

  for (const scope of LEADERBOARD_SCOPES) {
    const sorted = [...players].sort((a, b) => {
      const ratingDiff = b.ratingsByScope[scope] - a.ratingsByScope[scope];
      if (ratingDiff !== 0) {
        return ratingDiff;
      }
      return a.username.localeCompare(b.username);
    });

    rankMaps[scope] = new Map(sorted.map((player, index) => [player.username, index + 1]));
  }

  return rankMaps;
}

async function ensureArticle(title) {
  const normalizedTitle = title.trim();
  return prisma.article.upsert({
    where: { normalizedTitle },
    create: {
      title: normalizedTitle,
      normalizedTitle,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(normalizedTitle.replace(/ /g, "_"))}`,
    },
    update: {},
  });
}

async function main() {
  for (const seed of seeds) {
    const [startArticle, targetArticle] = await Promise.all([
      ensureArticle(seed.startTitle),
      ensureArticle(seed.targetTitle),
    ]);

    const slug = `${slugify(seed.startTitle)}-to-${slugify(seed.targetTitle)}`;

    await prisma.challenge.upsert({
      where: { slug },
      create: {
        slug,
        label: seed.label,
        startArticleId: startArticle.id,
        targetArticleId: targetArticle.id,
        difficultyScore: seed.difficultyScore,
        shortestPathHint: Math.max(2, Math.round(seed.difficultyScore / 20)),
        isActive: true,
      },
      update: {
        label: seed.label,
        difficultyScore: seed.difficultyScore,
        shortestPathHint: Math.max(2, Math.round(seed.difficultyScore / 20)),
        isActive: true,
      },
    });
  }

  const players = buildSeedPlayers();
  const ranksByScope = buildRanksByScope(players);

  for (const player of players) {
    const user = await prisma.user.upsert({
      where: { username: player.username },
      create: {
        username: player.username,
        displayName: player.displayName,
        avatarUrl: player.avatarUrl,
      },
      update: {
        displayName: player.displayName,
        avatarUrl: player.avatarUrl,
      },
      select: { id: true },
    });

    for (const scope of LEADERBOARD_SCOPES) {
      await prisma.leaderboardEntry.upsert({
        where: {
          scope_userId: {
            scope,
            userId: user.id,
          },
        },
        create: {
          scope,
          userId: user.id,
          rank: ranksByScope[scope].get(player.username) ?? DUMMY_PLAYER_POOL_SIZE,
          rating: player.ratingsByScope[scope],
          bestTimeMs: player.bestTimeMs,
          bestScore: player.runs,
        },
        update: {
          rank: ranksByScope[scope].get(player.username) ?? DUMMY_PLAYER_POOL_SIZE,
          rating: player.ratingsByScope[scope],
          bestTimeMs: player.bestTimeMs,
          bestScore: player.runs,
        },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
