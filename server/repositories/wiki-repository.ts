import { prisma } from "@/lib/prisma";
import { fetchArticleByTitle } from "@/server/services/wiki/wikipedia-service";

export async function ensureArticleRecord(rawTitle: string) {
  const article = await fetchArticleByTitle(rawTitle);

  return prisma.article.upsert({
    where: { normalizedTitle: article.normalizedTitle },
    create: {
      title: article.title,
      normalizedTitle: article.normalizedTitle,
      wikipediaPageId: article.pageId ?? null,
      url: article.url,
      summary: article.extract,
      isDisambiguation: false,
      linkCount: article.links.length,
    },
    update: {
      title: article.title,
      wikipediaPageId: article.pageId ?? null,
      url: article.url,
      summary: article.extract,
      linkCount: article.links.length,
      updatedAt: new Date(),
    },
  });
}
