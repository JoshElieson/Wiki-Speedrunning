import { prisma } from "@/lib/prisma";
import { type WikiModeId } from "@/lib/wiki-modes";
import { fetchArticleByTitleForWiki } from "@/server/services/wiki/wiki-provider";

export async function ensureArticleRecord(rawTitle: string, wikiId: WikiModeId = "wikipedia") {
  const article = await fetchArticleByTitleForWiki(wikiId, rawTitle);
  const namespacedNormalizedTitle =
    wikiId === "wikipedia" ? article.normalizedTitle : `${wikiId}:${article.normalizedTitle}`;

  return prisma.article.upsert({
    where: { normalizedTitle: namespacedNormalizedTitle },
    create: {
      title: article.title,
      normalizedTitle: namespacedNormalizedTitle,
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
