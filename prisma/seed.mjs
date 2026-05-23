import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LEADERBOARD_SCOPES = [
  "wikipedia",
  "minecraft",
  "league",
  "pokemon",
  "star-wars",
  "marvel",
];

/** Score columns map to LEADERBOARD_SCOPES in order (Wikipedia, then variety categories). */
const NAMED_DUMMY_PLAYERS = [
  { displayName: "WikiRacer42", ratings: [1180, 940, 1325, 760, 1110, 1245] },
  { displayName: "MarbleFox", ratings: [690, 1045, 1280, 515, 875, 1195] },
  { displayName: "PixelSprint", ratings: [1350, 1210, 980, 1125, 745, 1305] },
  { displayName: "NeonAnchor", ratings: [430, 860, 1095, 1255, 100, 970] },
  { displayName: "AtlasClicker", ratings: [1015, 770, 1160, 1340, 890, 1230] },
  { displayName: "LunarRoute", ratings: [560, 1120, 665, 985, 1290, 805] },
  { displayName: "RapidMango", ratings: [920, 1315, 710, 1040, 1175, 620] },
  { displayName: "CloverPath", ratings: [1260, 1085, 450, 790, 1335, 990] },
  { displayName: "EchoRunner", ratings: [875, 1205, 610, 1065, 138, 1140] },
  { displayName: "VertexPanda", ratings: [735, 1295, 1025, 845, 1188, 555] },
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

function slugifyUsername(displayName) {
  const slug = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
  return slug.length > 0 ? slug : "runner";
}

function buildSeedPlayers() {
  return NAMED_DUMMY_PLAYERS.map((player) => {
    const username = slugifyUsername(player.displayName);
    const ratingsByScope = Object.fromEntries(
      LEADERBOARD_SCOPES.map((scope, index) => [scope, player.ratings[index]]),
    );
    const bestTimeMs = 34_000 + (hashString(username) % 18_000);
    const runs = 40 + (hashString(`${username}:runs`) % 120);

    return {
      username,
      displayName: player.displayName,
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

  if (process.env.SEED_DUMMY_PLAYERS !== "true") {
    console.log("Skipping dummy leaderboard players (set SEED_DUMMY_PLAYERS=true to include them).");
    return;
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
          rank: ranksByScope[scope].get(player.username) ?? players.length,
          rating: player.ratingsByScope[scope],
          bestTimeMs: player.bestTimeMs,
          bestScore: player.runs,
        },
        update: {
          rank: ranksByScope[scope].get(player.username) ?? players.length,
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
