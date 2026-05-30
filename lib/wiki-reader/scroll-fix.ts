import type { WikiModeId } from "@/lib/wiki-modes";

export const EMBEDDED_WIKI_READER_SCROLL_FIX_CSS = `
html {
  height: 100% !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch;
}
body.skin-vector,
body.skin-vector-2022,
body {
  height: auto !important;
  min-height: 100% !important;
  overflow-x: hidden !important;
  overflow-y: visible !important;
  position: static !important;
}
.skin-vector .mw-body,
.skin-vector .mw-page-container,
.skin-vector .mw-page-container-inner,
.skin-vector .mw-body-content,
.skin-vector .mw-body-content-container,
.skin-vector #content,
.skin-vector .vector-body,
.skin-vector .vector-main,
.skin-vector-2022 .mw-body,
.skin-vector-2022 .mw-page-container,
.skin-vector-2022 .mw-page-container-inner,
.skin-vector-2022 .mw-body-content,
.skin-vector-2022 .mw-body-content-container,
.skin-vector-2022 #content,
.skin-vector-2022 .vector-body,
.skin-vector-2022 .vector-main,
.mw-body,
.mw-page-container,
.mw-page-container-inner,
.mw-body-content,
.mw-body-content-container,
#content,
.vector-body,
.vector-main,
main {
  height: auto !important;
  max-height: none !important;
  overflow: visible !important;
  position: static !important;
}
`;

export const EMBEDDED_WIKI_READER_SCROLL_FIX_CSS_MINIFIED = EMBEDDED_WIKI_READER_SCROLL_FIX_CSS.replace(
  /\s+/g,
  " ",
)
  .replace(/ ?([{}:;,]) ?/g, "$1")
  .trim();

const MODES_WITH_EMBEDDED_SCROLL_FIX = new Set<WikiModeId>(["minecraft", "league"]);

export function wikiModeNeedsReaderScrollFix(modeId: WikiModeId): boolean {
  return MODES_WITH_EMBEDDED_SCROLL_FIX.has(modeId);
}
