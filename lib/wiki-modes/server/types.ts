import type { WikiArticle } from "@/types/domain";
import type { WikiModeId } from "../types";

/**
 * Server-side wiki integration surface. Each enabled mode must register an adapter
 * that implements article fetch, link validation, and random page generation.
 */
export interface WikiModeServerAdapter {
  readonly modeId: WikiModeId;
  fetchArticleByTitle: (rawTitle: string) => Promise<WikiArticle>;
  isValidOutgoingLink: (currentTitle: string, candidateNextTitle: string) => Promise<boolean>;
  fetchRandomPageTitles: (limit: number) => Promise<string[]>;
}
