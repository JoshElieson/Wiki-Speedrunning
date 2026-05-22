import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
