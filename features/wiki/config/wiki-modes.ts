/**
 * @deprecated Import from `@/lib/wiki-modes` instead.
 */
export {
  getWikiModeConfig,
  getSafeWikiModeId,
  getWikiModeId,
  isLikelyModeArticleTitle,
  type WikiModeId,
  type WikiModeConfig,
} from "@/lib/wiki-modes";

import { ALL_WIKI_MODES } from "@/lib/wiki-modes";
import type { WikiModeId } from "@/lib/wiki-modes";

/** @deprecated Use `ALL_WIKI_MODES` from `@/lib/wiki-modes`. */
export const WIKI_MODE_CONFIGS = Object.fromEntries(
  ALL_WIKI_MODES.map((mode) => [mode.id, mode]),
) as Record<WikiModeId, (typeof ALL_WIKI_MODES)[number]>;
