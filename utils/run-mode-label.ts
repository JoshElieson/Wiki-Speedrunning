import { getWikiModeConfig, type WikiModeId } from "@/lib/wiki-modes";

export function getRunModeLabel(wikiMode: WikiModeId): string {
  const config = getWikiModeConfig(wikiMode);
  return wikiMode === "wikipedia" ? config.displayName : (config.shortName ?? config.displayName);
}

export function getRunModeBadgeClassName(wikiMode: WikiModeId): string {
  const { accent } = getWikiModeConfig(wikiMode);
  return `${accent.badgeBg} ${accent.heroText} border-[var(--border)]`;
}
