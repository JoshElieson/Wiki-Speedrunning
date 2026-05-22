"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { WikiArticle } from "@/types/domain";
import { Card } from "@/components/ui/card";
import { WikiLink } from "@/features/wiki/components/WikiLink";

interface ArticlePanelProps {
  article: WikiArticle | undefined;
  isLoading: boolean;
  isActiveRace: boolean;
  invalidMoveTitle: string | null;
  onLinkClick: (title: string) => void;
}

function ArticleSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-4 w-1/3 animate-pulse rounded bg-[#ddd7ca]" />
      <div className="h-4 w-full animate-pulse rounded bg-[#ddd7ca]" />
      <div className="h-4 w-4/5 animate-pulse rounded bg-[#ddd7ca]" />
      <div className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-10 animate-pulse rounded-lg bg-[#ddd7ca]" />
        ))}
      </div>
    </div>
  );
}

export function ArticlePanel({ article, isLoading, isActiveRace, invalidMoveTitle, onLinkClick }: ArticlePanelProps) {
  return (
    <Card className="p-5">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="article-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ArticleSkeleton />
          </motion.div>
        ) : (
          <motion.div
            key={article?.normalizedTitle ?? "article-empty"}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Article Summary</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {article?.extract || "No article data available for this title."}
              </p>
            </div>

            {invalidMoveTitle ? (
              <div className="rounded-[var(--radius-sm)] border border-[#c9a063]/50 bg-[#f8f1e2] px-3 py-2 text-xs text-[#6a4e1f]">
                `{invalidMoveTitle}` is not a valid in-article link from this page.
              </div>
            ) : null}

            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Available Links</p>
              {(article?.links?.length ?? 0) > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {(article?.links ?? []).slice(0, 40).map((link) => (
                    <WikiLink
                      key={link.normalizedTitle}
                      title={link.title}
                      onClick={onLinkClick}
                      disabled={!isActiveRace}
                      highlighted={false}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-xs text-[var(--muted)]">
                  No playable internal links were returned for this article.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
