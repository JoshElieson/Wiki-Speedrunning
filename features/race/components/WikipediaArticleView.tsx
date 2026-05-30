"use client";

import { useEffect, useMemo, useRef } from "react";
import { extractInternalArticleTitle } from "@/features/wiki/services/wikiApi";
import { getWikiMode, resolveWikiModeId, type WikiModeId } from "@/lib/wiki-modes";
import {
  applyEmbeddedWikiReaderWheelScroll,
  EMBEDDED_WIKI_READER_SCROLL_FIX_CSS,
  getEmbeddedWikiReaderScrollRoot,
  wikiModeNeedsReaderScrollFix,
} from "@/lib/wiki-reader/scroll-fix";

interface WikipediaArticleViewProps {
  wikiMode: WikiModeId;
  title: string;
  displayTitle: string;
  html: string;
  isLoading: boolean;
  errorMessage: string | null;
  disableInteraction?: boolean;
  onLinkHover?: (title: string) => void;
  onInternalLinkClick: (title: string) => void;
}

export function WikipediaArticleView({
  wikiMode,
  title,
  displayTitle,
  html,
  isLoading,
  errorMessage,
  disableInteraction = false,
  onLinkHover,
  onInternalLinkClick,
}: WikipediaArticleViewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const resolvedMode = resolveWikiModeId(wikiMode);
  const wikiConfig = getWikiMode(resolvedMode);
  const isMarvelMode = resolvedMode === "marvel";
  const isLeagueMode = resolvedMode === "league";
  const isPokemonMode = resolvedMode === "pokemon";
  const isMinecraftMode = resolvedMode === "minecraft";
  const needsReaderScrollFix = wikiModeNeedsReaderScrollFix(resolvedMode);
  const isFandomMode = /fandom\.com/i.test(wikiConfig.baseUrl);
  const iframeSandbox = isFandomMode
    ? "allow-same-origin allow-scripts"
    : "allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts";
  const wikiStyleHrefs = useMemo(
    () =>
      wikiConfig.reader.styleSheetHrefs && wikiConfig.reader.styleSheetHrefs.length > 0
        ? wikiConfig.reader.styleSheetHrefs
        : wikiConfig.reader.styleSheetHref
          ? [wikiConfig.reader.styleSheetHref]
          : [],
    [wikiConfig.reader.styleSheetHref, wikiConfig.reader.styleSheetHrefs],
  );
  const readerShellBackgroundColor = isLeagueMode
    ? "#0a0e17"
    : isPokemonMode
      ? "#e4f3e4"
      : isMinecraftMode
        ? "#303030"
        : "#ffffff";

  const articleDocument = useMemo(() => {
    const safeDisplayTitle = displayTitle || title;
    const escapedTitle = safeDisplayTitle
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

    const styleLinks = wikiStyleHrefs.map((href) => `<link rel="stylesheet" href="${href}" />`).join("\n");
    const fandomChromeHideCss = isFandomMode
      ? `
      .global-navigation,
      .global-navigation__top,
      .global-navigation__bottom,
      .global-explore-navigation,
      .global-top-navigation,
      .community-navigation,
      .wds-global-navigation-wrapper,
      .fandom-community-header,
      .fandom-sticky-header,
      .fandom-sticky-header-container,
      #global-explore-navigation,
      #WikiaBar,
      #mixed-content-footer,
      .global-footer,
      .page-side-tools__wrapper,
      .top-ads-container,
      .bottom-ads-container,
      .wikia-ad,
      .ad-slot,
      .gpt-ad,
      [class*="gpt-ad"],
      .recirculation-rail,
      .explore-page,
      [class*="explore-feed"],
      [class*="ExploreCard"],
      .wds-modal,
      .wds-dialog,
      .wds-overlay,
      #LightboxModal,
      [role="dialog"],
      .notifications,
      .notifications-wrapper {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
      .main-container,
      .app-wrapper,
      .resizable-container,
      .page.has-right-rail {
        margin-left: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
      }
      `
      : "";
    const marvelReaderCss = isMarvelMode
      ? `
      body {
        background: #fff;
        color: #333;
        font-family: "Rubik", "Helvetica Neue", Helvetica, Arial, sans-serif;
      }
      .page-layout {
        display: block;
      }
      [data-page-toc] {
        display: none !important;
      }
      .page-main {
        border: 0;
        background: #fff;
        box-shadow: none;
        max-width: 100%;
      }
      .page-title {
        border-bottom: 0;
        font-family: "Rubik", "Helvetica Neue", Helvetica, Arial, sans-serif;
        font-size: 2rem;
        font-weight: 700;
        letter-spacing: -0.01em;
        line-height: 1.2;
        padding: 0.5rem 0 0.25rem;
      }
      .page-subtitle {
        margin-bottom: 0.75rem;
        color: #666;
        font-size: 0.8125rem;
      }
      .mw-body-content {
        font-family: "Rubik", "Helvetica Neue", Helvetica, Arial, sans-serif;
        font-size: 0.875rem;
        line-height: 1.6;
        color: #333;
      }
      .mw-body-content .mw-parser-output {
        overflow: visible;
      }
      .mw-body-content .mw-parser-output > p:first-of-type {
        margin-top: 0;
      }
      .mw-body-content a {
        color: #0645ad;
        text-decoration: none;
      }
      .mw-body-content a:hover {
        text-decoration: underline;
      }
      .mw-body-content h2 {
        border-bottom: 1px solid #a2a9b1;
        margin: 1.25em 0 0.35em;
        padding-bottom: 0.2em;
        font-size: 1.4em;
        font-weight: 700;
        clear: left;
      }
      .mw-body-content h3 {
        font-size: 1.15em;
        font-weight: 700;
        margin: 0.9em 0 0.25em;
      }
      .mw-body-content .portable-infobox {
        float: right;
        clear: right;
        width: 270px;
        max-width: min(340px, 100%);
        margin: 0 0 1em 1em;
        border: 1px solid #ccc;
        background: #fff;
        font-size: 0.875rem;
        line-height: 1.45;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
        overflow: hidden;
      }
      .mw-body-content .portable-infobox .pi-secondary-background {
        background-color: #520008 !important;
        color: #fff !important;
      }
      .mw-body-content .portable-infobox .pi-title,
      .mw-body-content .portable-infobox .pi-header {
        text-align: center;
        font-weight: 700;
        font-size: 1em;
        padding: 0.45em 0.6em;
        margin: 0;
      }
      .mw-body-content .portable-infobox .pi-title a,
      .mw-body-content .portable-infobox .pi-header a {
        color: inherit;
      }
      .mw-body-content .portable-infobox .pi-item-spacing {
        padding: 0.35em 0.6em;
      }
      .mw-body-content .portable-infobox .pi-data {
        display: block;
        border-top: 1px solid #ccc;
      }
      .mw-body-content .portable-infobox .pi-data-label {
        font-weight: 700;
        font-size: 0.92em;
        display: block;
        margin-bottom: 0.15em;
      }
      .mw-body-content .portable-infobox .pi-data-value {
        display: block;
      }
      .mw-body-content .portable-infobox .pi-border-color {
        border-color: #ccc;
      }
      .mw-body-content .portable-infobox .pi-image {
        text-align: center;
      }
      .mw-body-content .portable-infobox .pi-image-thumbnail {
        max-width: 100%;
        height: auto;
      }
      .mw-body-content .portable-infobox .pi-collapse-closed > .pi-data,
      .mw-body-content .portable-infobox .pi-collapse-closed > .pi-smart-group {
        display: none !important;
      }
      .mw-body-content .portable-infobox .pi-collapse .pi-header {
        cursor: pointer;
        position: relative;
        padding-right: 1.5em;
      }
      .mw-body-content .portable-infobox .pi-collapse-closed .pi-header::after {
        content: "▾";
        position: absolute;
        right: 0.6em;
        font-size: 0.85em;
      }
      .mw-body-content .portable-infobox .pi-collapse-open .pi-header::after {
        content: "▴";
        position: absolute;
        right: 0.6em;
        font-size: 0.85em;
      }
      .mw-body-content .portable-infobox .pi-smart-group-head,
      .mw-body-content .portable-infobox .pi-smart-group-body {
        display: block;
      }
      .mw-body-content #toc,
      .mw-body-content .toc {
        display: table;
        background-color: #f8f9fa;
        border: 1px solid #a2a9b1;
        padding: 7px;
        font-size: 95%;
        line-height: 1.5;
        margin: 0 0 1em;
        max-width: min(100%, 24em);
      }
      .mw-body-content #toc .toctitle,
      .mw-body-content .toc .toctitle {
        text-align: center;
        font-weight: 700;
      }
      .mw-body-content #toc .toctitle h2,
      .mw-body-content .toc .toctitle h2,
      .mw-body-content #toc #mw-toc-heading,
      .mw-body-content .toc #mw-toc-heading {
        display: inline;
        margin: 0;
        padding: 0;
        border: 0;
        font-size: 1em;
        font-weight: 700;
        font-family: inherit;
      }
      .mw-body-content #toc ul,
      .mw-body-content .toc ul {
        list-style: none;
        margin: 0.35em 0 0;
        padding-left: 0;
      }
      .mw-body-content #toc .tocnumber,
      .mw-body-content .toc .tocnumber {
        color: #333;
        padding-right: 0.35em;
      }
      .mw-body-content #toc .toctogglelabel::before,
      .mw-body-content .toc .toctogglelabel::before {
        content: "[hide]";
      }
      .mw-body-content #toc .toctogglecheckbox:checked + .toctitle .toctogglelabel::before,
      .mw-body-content .toc .toctogglecheckbox:checked + .toctitle .toctogglelabel::before {
        content: "[show]";
      }
      .mw-body-content #toc .toctogglecheckbox:checked ~ ul,
      .mw-body-content .toc .toctogglecheckbox:checked ~ ul {
        display: none;
      }
      .mw-body-content #toc .toctogglelabel,
      .mw-body-content .toc .toctogglelabel {
        cursor: pointer;
        color: #0645ad;
        font-size: 0.875rem;
        font-weight: 400;
      }
      .mw-body-content .gallery {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
      }
      .mw-body-content .gallerybox {
        max-width: min(250px, 100%);
      }
      .mw-body-content .navbox {
        clear: both;
        overflow-x: auto;
        margin-top: 1rem;
      }
      .mw-body-content .table-scroll {
        overflow-x: auto;
        margin: 0.45rem 0;
      }
      .mw-body-content .table-scroll > table {
        min-width: 540px;
      }
      .mw-body-content .mw-editsection,
      .mw-body-content .wikia-ad,
      .mw-body-content [class*="ad-slot"],
      .mw-body-content .comment-area,
      .mw-body-content .comments,
      .mw-body-content .recirculation-rail,
      .mw-body-content .reference-edit,
      .mw-body-content .portable-infobox__edit {
        display: none !important;
      }
      @media (max-width: 640px) {
        .mw-body-content .portable-infobox {
          float: none;
          width: 100%;
          max-width: 100%;
          margin: 0 0 1em;
        }
      }
      `
      : "";
    const leagueReaderCss = isLeagueMode
      ? `
      html {
        background: #0a0e17;
      }
      body {
        background: #0a0e17;
        color: #c9c9c9;
        font-family: "Rubik", "Inter", "Segoe UI", Arial, sans-serif;
      }
      .page-layout {
        display: flex !important;
        align-items: flex-start;
        gap: 12px;
      }
      .page-layout--no-toc {
        display: block !important;
      }
      .page-layout--no-toc .page-toc {
        display: none !important;
      }
      .page-main {
        border: 0;
        background: transparent;
        min-width: 0;
        flex: 1 1 auto;
      }
      .page-toc {
        display: block !important;
        position: sticky;
        top: 8px;
        width: 220px;
        flex: 0 0 220px;
        align-self: flex-start;
        border-color: #393e4a;
        background: #0f1520;
        color: #c9c9c9;
      }
      .page-toc-title {
        color: #f0e6d2;
      }
      .page-toc-toggle {
        border-color: #393e4a;
        background: #151b28;
        color: #c9c9c9;
      }
      .page-toc-link {
        color: #0099ff;
      }
      .page-title {
        border-bottom: 1px solid #393e4a;
        font-family: "Times New Roman", Georgia, serif;
        font-size: 2.35rem;
        font-weight: 400;
        color: #f0e6d2;
      }
      .page-subtitle {
        margin-bottom: 0.9rem;
        color: #a09b8c;
      }
      .mw-body-content {
        font-size: 0.94rem;
        line-height: 1.65;
        color: #c9c9c9;
      }
      .mw-body-content a {
        color: #0099ff;
      }
      .mw-body-content h2,
      .mw-body-content h3,
      .mw-body-content h4 {
        color: #f0e6d2;
        border-bottom: 1px solid #393e4a;
        font-family: "Times New Roman", Georgia, serif;
        font-weight: 400;
      }
      .mw-body-content .portable-infobox,
      .mw-body-content .infobox {
        float: right;
        width: min(350px, 100%);
        margin: 0 0 1rem 1rem;
      }
      .mw-body-content .wikitable:not(.navbox),
      .mw-body-content .article-table:not(.navbox),
      .mw-body-content .va-table:not(.navbox) {
        border: 1px solid #393e4a;
        background: #0f1520;
      }
      .mw-body-content .wikitable:not(.navbox) th,
      .mw-body-content .article-table:not(.navbox) th,
      .mw-body-content .va-table:not(.navbox) th {
        background: #151b28;
        color: #f0e6d2;
      }
      .mw-body-content .navbox,
      .mw-body-content .navbox-wrapper {
        border: 0;
        background: transparent;
        margin-top: 1rem;
      }
      .mw-body-content .navbox .navbox-cell,
      .mw-body-content .navbox th,
      .mw-body-content .navbox td {
        border-color: #393e4a;
        color: #c9c9c9;
      }
      .mw-body-content .navbox-wrapper .mw-collapsible-header {
        color: #c8aa6e;
      }
      .mw-body-content .navbox-wrapper .mw-collapsible-header a {
        color: #c8aa6e;
      }
      .mw-body-content .gallery {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 0.65rem;
      }
      .mw-body-content .gallery .gallerybox {
        margin: 0;
        max-width: 100%;
      }
      .mw-body-content .toc,
      .mw-body-content #toc {
        display: none !important;
      }
      .mw-body-content .mw-collapsible.mw-collapsed > .mw-collapsible-content,
      .mw-body-content .mw-collapsible.mw-collapsed > .va-collapsible-content {
        display: none !important;
      }
      .mw-body-content td.mw-collapsible.mw-collapsed > .mw-collapsible-content,
      .mw-body-content th.mw-collapsible.mw-collapsed > .mw-collapsible-content {
        display: none !important;
      }
      .mw-body-content .mw-collapsible-header {
        position: relative;
      }
      .mw-body-content .mw-collapsible-toggle {
        position: absolute;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        color: #0099ff;
        text-decoration: none;
        font-size: 0.85em;
        font-weight: 400;
      }
      .mw-body-content .wikia-ad,
      .mw-body-content .ad-slot,
      .mw-body-content [class*="gpt-ad"],
      .mw-body-content .comment-area,
      .mw-body-content .comments,
      .mw-body-content .recirculation-rail,
      .mw-body-content .mw-editsection {
        display: none !important;
      }
      `
      : "";
    const minecraftReaderCss = isMinecraftMode
      ? `
      html {
        background: var(--base-background-color, #303030);
      }
      body {
        background: var(--base-background-color, #303030);
        color: #202122;
        font-family: "Liberation Sans", Arial, Helvetica, FreeSans, sans-serif;
      }
      .page-layout {
        display: block;
        margin-top: 84px;
        background-color: var(--content-background-color, #e6eff4);
        border-top: 6px solid var(--content-border-top-color, #b4bec3);
        border-left: 6px solid #171717;
        padding: 0.35em 0.75em 1em;
      }
      .page-main {
        padding: 0.35em 0.5em 0.75em;
      }
      [data-page-toc] {
        display: none !important;
      }
      .mw-body-content #toc,
      .mw-body-content .toc {
        display: table;
        background-color: #f8f9fa;
        border: 1px solid #a2a9b1;
        padding: 7px;
        font-size: 95%;
        line-height: 1.5;
        margin: 0.75em 0 1em;
        max-width: min(100%, 24em);
      }
      .mw-body-content #toc .toctitle,
      .mw-body-content .toc .toctitle {
        text-align: center;
        font-weight: 700;
      }
      .mw-body-content #toc .toctitle h2,
      .mw-body-content .toc .toctitle h2,
      .mw-body-content #toc #mw-toc-heading,
      .mw-body-content .toc #mw-toc-heading {
        display: inline;
        margin: 0;
        padding: 0;
        border: 0;
        font-size: 1em;
        font-weight: 700;
        font-family: inherit;
      }
      .mw-body-content #toc ul,
      .mw-body-content .toc ul {
        list-style: none;
        margin: 0.35em 0 0;
        padding-left: 0;
      }
      .mw-body-content #toc .tocnumber,
      .mw-body-content .toc .tocnumber {
        color: #202122;
      }
      .mw-body-content #toc a,
      .mw-body-content .toc a {
        color: #0645ad;
      }
      .mw-body-content #toc .toctogglelabel::before,
      .mw-body-content .toc .toctogglelabel::before {
        content: "[hide]";
      }
      .mw-body-content #toc .toctogglecheckbox:checked + .toctitle .toctogglelabel::before,
      .mw-body-content .toc .toctogglecheckbox:checked + .toctitle .toctogglelabel::before {
        content: "[show]";
      }
      .mw-body-content #toc .toctogglecheckbox:checked ~ ul,
      .mw-body-content .toc .toctogglecheckbox:checked ~ ul {
        display: none;
      }
      .mw-body-content #toc .toctogglelabel,
      .mw-body-content .toc .toctogglelabel {
        cursor: pointer;
        color: #0645ad;
        font-size: 0.875rem;
        font-weight: 400;
      }
      .mw-body-content .mw-heading2,
      .mw-body-content .mw-heading3,
      .mw-body-content .mw-heading4 {
        border-bottom: 1px solid #a2a9b1;
        margin-top: 1em;
        margin-bottom: 0.25em;
      }
      `
      : "";
    const pokemonReaderCss = isPokemonMode
      ? `
      body.bulbapedia-reader {
        background-color: #e4f3e4 !important;
        background-image: var(--header-background-hidpi, var(--header-background, none)) !important;
        background-repeat: repeat !important;
        background-position: top center !important;
        background-attachment: fixed !important;
        color: #000;
        font-family: "Helvetica Neue", "Segoe UI", Helvetica, Arial, sans-serif;
      }
      .bulbapedia-site {
        min-height: 100%;
      }
      .bulbapedia-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-height: 40px;
        padding: 0 14px;
        background: linear-gradient(180deg, #1f3b22 0%, #162d19 100%);
        color: #fff;
        font-size: 0.8125rem;
        line-height: 1.2;
      }
      .bulbapedia-topbar-left,
      .bulbapedia-topbar-right {
        display: flex;
        align-items: center;
        gap: 14px;
        min-width: 0;
      }
      .bulbapedia-brand {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-weight: 700;
        letter-spacing: 0.04em;
        font-size: 0.78rem;
        white-space: nowrap;
      }
      .bulbapedia-brand-icon {
        width: 14px;
        height: 14px;
        flex: 0 0 14px;
      }
      .bulbapedia-nav {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .bulbapedia-nav a,
      .bulbapedia-topbar-right a {
        color: #fff;
        text-decoration: none;
      }
      .bulbapedia-nav-item {
        display: inline-flex;
        align-items: center;
        gap: 3px;
      }
      .bulbapedia-icon {
        width: 10px;
        height: 10px;
        flex: 0 0 10px;
        opacity: 0.85;
      }
      .bulbapedia-search {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-width: 180px;
        max-width: 240px;
        padding: 5px 10px;
        border-radius: 999px;
        background: #fff;
        color: #6b7280;
        font-size: 0.75rem;
      }
      .bulbapedia-search-icon {
        width: 12px;
        height: 12px;
        flex: 0 0 12px;
        color: #4b5563;
      }
      .bulbapedia-viewport {
        max-width: 1060px;
        margin: 0 auto;
        padding: 0 12px 20px;
      }
      .bulbapedia-pagetools {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin: 0 -1px;
        padding: 6px 12px 0;
        border: 1px solid #b8d4b8;
        border-bottom: 0;
        background: #f6fbf6;
        font-size: 0.75rem;
        color: #374151;
      }
      .bulbapedia-pagetools-tabs,
      .bulbapedia-pagetools-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .bulbapedia-pagetools-tabs a,
      .bulbapedia-pagetools-actions a {
        color: #0645ad;
        text-decoration: none;
      }
      .bulbapedia-pagetools-tabs .is-active {
        font-weight: 700;
        color: #111827;
      }
      .bulbapedia-content-panel {
        border: 1px solid #b8d4b8;
        border-top: 0;
        background: #fff;
        padding: 0.65rem 1.1rem 1.25rem;
      }
      .bulbapedia-notice {
        margin: 0 0 0.75rem;
        padding: 0.55rem 0.75rem;
        border: 1px solid #b8d4b8;
        border-radius: 6px;
        background: #edf8ed;
        color: #1f2937;
        font-size: 0.8125rem;
        line-height: 1.45;
      }
      .bulbapedia-notice a {
        color: #0645ad;
        text-decoration: none;
      }
      main {
        padding: 0;
      }
      .page-layout {
        display: block;
        background: transparent;
        padding: 0;
      }
      [data-page-toc] {
        display: none !important;
      }
      .page-main {
        border: 0;
        background: transparent;
        box-shadow: none;
        max-width: 100%;
        margin: 0 auto;
      }
      .page-title {
        border-bottom: 0;
        font-family: "Helvetica Neue", "Segoe UI", Helvetica, Arial, sans-serif;
        font-size: 1.85rem;
        font-weight: 700;
        line-height: 1.15;
        padding: 0.15rem 0 0.35rem;
      }
      .page-subtitle {
        margin-bottom: 0.65rem;
        color: #54595d;
        font-size: 0.8125rem;
      }
      .mw-body-content {
        font-size: 0.875rem;
        line-height: 1.6;
      }
      .mw-body-content a {
        color: #0645ad;
        text-decoration: none;
      }
      .mw-body-content a:hover {
        text-decoration: underline;
      }
      .mw-body-content .mw-parser-output {
        overflow-x: visible;
      }
      .mw-body-content .mw-parser-output > p:first-of-type {
        margin-top: 0;
      }
      .mw-body-content h2 {
        clear: both;
        border-bottom: 1px solid #a2a9b1;
        margin: 1.2em 0 0.35em;
        padding-bottom: 0.2em;
        font-size: 1.4em;
        font-weight: 700;
        font-family: "Helvetica Neue", "Segoe UI", Helvetica, Arial, sans-serif;
      }
      .mw-body-content h3 {
        font-size: 1.15em;
        font-weight: 700;
        margin: 0.9em 0 0.25em;
      }
      .mw-body-content .sc {
        font-variant: small-caps;
      }
      .mw-body-content #toc,
      .mw-body-content .toc {
        display: table;
        float: left;
        clear: left;
        background-color: #f8f9fa;
        border: 1px solid #a2a9b1;
        padding: 7px;
        font-size: 88%;
        line-height: 1.45;
        margin: 0 1em 0.75em 0;
        max-width: min(100%, 20em);
      }
      .mw-body-content #toc .toctitle,
      .mw-body-content .toc .toctitle {
        text-align: center;
        font-weight: 700;
        font-size: 0.95em;
      }
      .mw-body-content #toc .toctitle h2,
      .mw-body-content .toc .toctitle h2,
      .mw-body-content #toc #mw-toc-heading,
      .mw-body-content .toc #mw-toc-heading {
        display: inline;
        margin: 0;
        padding: 0;
        border: 0;
        font-size: 1em;
        font-weight: 700;
        font-family: inherit;
      }
      .mw-body-content #toc ul,
      .mw-body-content .toc ul {
        list-style: none;
        margin: 0.35em 0 0;
        padding-left: 0;
      }
      .mw-body-content #toc .tocnumber,
      .mw-body-content .toc .tocnumber {
        color: #202122;
      }
      .mw-body-content #toc a,
      .mw-body-content .toc a {
        color: #0645ad;
      }
      .mw-body-content #toc .toctogglelabel::before,
      .mw-body-content .toc .toctogglelabel::before {
        content: "[hide]";
      }
      .mw-body-content #toc .toctogglecheckbox:checked + .toctitle .toctogglelabel::before,
      .mw-body-content .toc .toctogglecheckbox:checked + .toctitle .toctogglelabel::before {
        content: "[show]";
      }
      .mw-body-content #toc .toctogglecheckbox:checked ~ ul,
      .mw-body-content .toc .toctogglecheckbox:checked ~ ul {
        display: none;
      }
      .mw-body-content #toc .toctogglelabel,
      .mw-body-content .toc .toctogglelabel {
        cursor: pointer;
        color: #0645ad;
        font-size: 0.8125rem;
        font-weight: 400;
      }
      .mw-body-content center,
      .mw-body-content .center {
        display: block;
        text-align: center;
      }
      .mw-body-content center table.roundy,
      .mw-body-content .center table.roundy,
      .mw-body-content table.roundy[align="center"] {
        margin-left: auto;
        margin-right: auto;
      }
      .mw-body-content table {
        display: table !important;
        border-collapse: separate;
        border-spacing: 0;
      }
      .mw-body-content table.infobox,
      .mw-body-content table.roundy.infobox,
      .mw-body-content .roundy.infobox {
        float: right;
        clear: right;
        width: auto;
        max-width: min(500px, 100%);
        margin: 0 0 1rem 1rem;
        border-collapse: collapse;
        box-sizing: border-box;
      }
      .mw-body-content table.roundy[align="left"] {
        float: left;
        clear: left;
        margin: 0 0.5rem 0.5rem 0;
      }
      .mw-body-content table.roundy[align="right"] {
        float: right;
        clear: right;
        margin: 0 0 0.5rem 0.5rem;
      }
      .mw-body-content table.wikitable,
      .mw-body-content table.sortable,
      .mw-body-content table.roundy,
      .mw-body-content .sortable {
        display: table !important;
        width: auto !important;
        max-width: none !important;
        overflow: visible !important;
      }
      .mw-body-content .gallery {
        display: flex;
        flex-wrap: wrap;
        gap: 0.65rem;
      }
      .mw-body-content .gallerybox {
        max-width: min(250px, 100%);
      }
      .mw-body-content .navbox,
      .mw-body-content .navbox-wrapper {
        clear: both;
        overflow-x: auto;
        max-width: 100%;
      }
      .mw-body-content .navbox {
        margin-top: 1rem;
      }
      .mw-body-content .collapsible.collapsed > tr:not(:first-child),
      .mw-body-content .collapsible.collapsed > tbody > tr:not(:first-child),
      .mw-body-content .collapsible.collapsed > thead + tbody > tr:first-child,
      .mw-body-content .collapsible.collapsed > tbody + tbody > tr:first-child,
      .mw-body-content .collapsible.collapsed > tfoot > tr,
      .mw-body-content .collapsible.collapsed > .collapsible-content {
        display: none !important;
      }
      .mw-body-content .collapsetoggle {
        display: inline-block;
        float: right;
        margin-left: 0.8em;
        font-weight: 400;
        font-style: normal;
        text-align: right;
      }
      .mw-body-content .collapsetoggle .jslink {
        cursor: pointer;
        color: #0645ad;
      }
      .mw-body-content .navbox-top {
        position: relative;
      }
      .mw-body-content .mw-editsection,
      .mw-body-content .reference-edit {
        display: none !important;
      }
      @media (max-width: 720px) {
        .bulbapedia-topbar {
          flex-wrap: wrap;
          padding-top: 6px;
          padding-bottom: 6px;
        }
        .bulbapedia-search {
          min-width: 0;
          flex: 1 1 140px;
        }
        .bulbapedia-viewport {
          padding-left: 6px;
          padding-right: 6px;
        }
        .mw-body-content #toc,
        .mw-body-content .toc {
          float: none;
          clear: both;
          max-width: 100%;
        }
      }
      `
      : "";
    const pokemonChevronIcon =
      '<svg class="bulbapedia-icon" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.25 5 6.25 8 3.25" fill="currentColor"/></svg>';
    const pokemonBrandIcon =
      '<svg class="bulbapedia-brand-icon" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="#fff"/><circle cx="8" cy="8" r="2.5" fill="#1f3b22"/><path d="M1 8h14" stroke="#1f3b22" stroke-width="2"/></svg>';
    const pokemonSearchIcon =
      '<svg class="bulbapedia-search-icon" viewBox="0 0 16 16" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.25" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 10l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    const pokemonChromeHtml = isPokemonMode
      ? `
      <div class="bulbapedia-site">
        <header class="bulbapedia-topbar" aria-hidden="true">
          <div class="bulbapedia-topbar-left">
            <div class="bulbapedia-brand">${pokemonBrandIcon}<span>BULBAGARDEN</span></div>
            <nav class="bulbapedia-nav">
              <span class="bulbapedia-nav-item"><span>Bulbapedia</span>${pokemonChevronIcon}</span>
              <span class="bulbapedia-nav-item"><span>News</span>${pokemonChevronIcon}</span>
              <span class="bulbapedia-nav-item"><span>Forums</span>${pokemonChevronIcon}</span>
              <span class="bulbapedia-nav-item"><span>Socials</span>${pokemonChevronIcon}</span>
              <span class="bulbapedia-nav-item"><span>More</span>${pokemonChevronIcon}</span>
            </nav>
          </div>
          <div class="bulbapedia-topbar-right">
            <span class="bulbapedia-nav-item"><span>Editors</span>${pokemonChevronIcon}</span>
            <span class="bulbapedia-nav-item"><span>Account</span>${pokemonChevronIcon}</span>
            <div class="bulbapedia-search">${pokemonSearchIcon}<span>Search Bulbapedia</span></div>
          </div>
        </header>
        <div class="bulbapedia-viewport">
          <div class="bulbapedia-pagetools" aria-hidden="true">
            <div class="bulbapedia-pagetools-tabs">
              <span class="is-active">Article</span>
              <a href="#">Discussion</a>
            </div>
            <div class="bulbapedia-pagetools-actions">
              <a href="#">View source</a>
              <a href="#">View history</a>
              <span>More ${pokemonChevronIcon}</span>
            </div>
          </div>
          <div class="bulbapedia-content-panel">
            <div class="bulbapedia-notice" aria-hidden="true">
              Welcome to Bulbapedia! Please remember to follow the
              <a href="#">manual of style</a> and
              <a href="#">code of conduct</a> at all times.
            </div>
      `
      : "";
    const pokemonChromeFooter = isPokemonMode
      ? `
          </div>
        </div>
      </div>
      `
      : "";
    const pageMainHtml = `
      <main>
        <div class="page-layout">
          <aside class="page-toc" aria-collapsed="false" data-page-toc hidden>
            <div class="page-toc-header">
              <h2 class="page-toc-title">Contents</h2>
              <button class="page-toc-toggle" type="button" data-toc-toggle>hide</button>
            </div>
            <nav class="page-toc-body">
              <ul class="page-toc-list" data-toc-root></ul>
            </nav>
          </aside>
          <div class="page-main">
            <h1 class="page-title">${escapedTitle}</h1>
            <p class="page-subtitle">${wikiConfig.reader.articleSubtitle ?? `From ${wikiConfig.displayName}`}</p>
            <div class="mw-body-content">
              ${html}
            </div>
          </div>
        </div>
      </main>
    `;
    const genericInfoboxCss = isMinecraftMode || isPokemonMode
      ? ""
      : `
      .mw-body-content .infobox,
      .mw-body-content .notaninfobox {
        float: right;
        margin: 0 0 0.9rem 0.9rem;
        border: 1px solid #a2a9b1;
        background: #f8f9fa;
        border-collapse: collapse;
        max-width: min(24rem, 100%);
        font-size: 0.85rem;
      }
      .mw-body-content .infobox td,
      .mw-body-content .infobox th,
      .mw-body-content .notaninfobox td,
      .mw-body-content .notaninfobox th {
        border: 1px solid #a2a9b1;
        padding: 0.28rem 0.45rem;
        vertical-align: top;
      }
      .mw-body-content .infobox-title,
      .mw-body-content .mcwiki-header {
        font-weight: 700;
        text-align: center;
        padding: 0.35rem 0.45rem;
      }
      `;

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${isFandomMode ? '<meta name="referrer" content="no-referrer" />' : ""}
    <base href="${wikiConfig.baseUrl}/" />
    ${styleLinks}
    <style>
      html {
        margin: 0;
        padding: 0;
        background: #fff;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        height: 100%;
      }
      body {
        margin: 0;
        background: #fff;
        color: #202122;
        font-family: sans-serif;
        overflow-x: hidden !important;
        overflow-y: visible !important;
        min-height: 100%;
      }
      .page-layout {
        display: flex;
        align-items: flex-start;
        gap: 16px;
      }
      .page-toc {
        position: sticky;
        top: 8px;
        width: 230px;
        flex: 0 0 230px;
        border: 1px solid #eaecf0;
        background: #fff;
        padding: 10px 10px 12px;
        font-size: 0.95rem;
      }
      .page-toc-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 8px;
      }
      .page-toc-title {
        margin: 0;
        font-size: 1rem;
        font-weight: 700;
      }
      .page-toc-toggle {
        border: 1px solid #eaecf0;
        background: #f8f9fa;
        padding: 2px 8px;
        font-size: 0.875rem;
        line-height: 1.3;
        color: #202122;
        cursor: pointer;
      }
      .page-toc-list,
      .page-toc-sublist {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .page-toc-item {
        margin: 4px 0;
      }
      .page-toc-line {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .page-toc-link {
        color: #0645ad;
        text-decoration: none;
      }
      .page-toc-link:hover {
        text-decoration: underline;
      }
      .page-toc-arrow {
        border: 0;
        background: none;
        color: #54595d;
        font-size: 0.85rem;
        line-height: 1;
        cursor: pointer;
        width: 1rem;
        padding: 0;
      }
      .page-toc-sublist {
        margin-left: 18px;
      }
      .page-toc-sublist[hidden] {
        display: none;
      }
      .page-toc[aria-collapsed="true"] .page-toc-body {
        display: none;
      }
      .page-main {
        min-width: 0;
        flex: 1 1 auto;
      }
      main {
        padding: 0 8px 12px;
      }
      .page-title {
        margin: 0;
        border-bottom: 1px solid #a2a9b1;
        padding: 10px 0 8px;
        color: #202122;
        font-family: "Linux Libertine", "Georgia", "Times", serif;
        font-size: 2.1rem;
        font-weight: 400;
        line-height: 1.15;
      }
      .page-subtitle {
        margin: 0.2rem 0 0.75rem;
        color: #54595d;
        font-size: 0.875rem;
      }
      .mw-body-content {
        font-size: 0.875rem;
        line-height: 1.6;
      }
      .mw-body,
      .mw-page-container,
      .mw-body-content,
      #content,
      .vector-body,
      .skin-vector-legacy .mw-page-container {
        overflow: visible !important;
      }
      .mw-body-content img {
        max-width: 100%;
        height: auto;
      }
      .mw-body-content table {
        max-width: 100%;
      }
      .mw-body-content table.wikitable:not(.navbox),
      .mw-body-content .article-table:not(.navbox),
      .mw-body-content .sortable:not(.navbox) {
        display: block;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        width: 100%;
      }
      .mw-body-content table.navbox,
      .mw-body-content .navbox-wrapper table {
        display: table !important;
        width: 100%;
      }
      .mw-collapsible.mw-collapsed > .mw-collapsible-content,
      .mw-collapsible.mw-collapsed > .va-collapsible-content {
        display: none !important;
      }
      td.mw-collapsible.mw-collapsed > .mw-collapsible-content,
      th.mw-collapsible.mw-collapsed > .mw-collapsible-content {
        display: none !important;
      }
      .mw-editsection,
      .mw-empty-elt {
        display: none !important;
      }
      ${genericInfoboxCss}
      .mw-body-content .history-json,
      .mw-body-content pre.history-json,
      .mw-body-content .navigation-not-searchable.history-json {
        display: none !important;
      }
      .mw-body-content .reflist,
      .mw-body-content .reference {
        font-size: 0.82rem;
        line-height: 1.45;
      }
      .mw-body-content .portable-infobox {
        float: right;
        width: min(340px, 100%);
        margin: 0 0 1rem 1rem;
        border: 1px solid #cdd6e0;
        border-radius: 2px;
        background: #f7f9fc;
        color: #1d1d1d;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
        overflow: hidden;
      }
      .mw-body-content .portable-infobox .pi-title,
      .mw-body-content .portable-infobox .pi-caption {
        padding: 0.55rem 0.7rem;
        font-weight: 700;
        background: #e9eef5;
      }
      .mw-body-content .portable-infobox .pi-item {
        padding: 0.4rem 0.65rem;
        border-top: 1px solid #d7dee8;
      }
      .mw-body-content .portable-infobox .pi-data-label {
        font-weight: 700;
        color: #2e3b4e;
        margin-bottom: 0.12rem;
      }
      .mw-body-content .portable-infobox .pi-data-value {
        color: #1d1d1d;
      }
      .mw-body-content .portable-infobox figure,
      .mw-body-content .portable-infobox img {
        width: 100%;
      }
      .mw-body-content blockquote,
      .mw-body-content .quote,
      .mw-body-content .cquote {
        margin: 0.9rem 0;
        padding: 0.7rem 0.9rem;
        border-left: 4px solid #5b7aa3;
        background: #f4f7fb;
        font-style: italic;
      }
      .mw-body-content .hatnote,
      .mw-body-content .ambox,
      .mw-body-content .mbox,
      .mw-body-content .notice,
      .mw-body-content .nomobile {
        margin: 0.8rem 0;
        padding: 0.55rem 0.75rem;
        border: 1px solid #d8dee8;
        background: #fffdf4;
      }
      .mw-body-content .navbox {
        margin-top: 1rem;
      }
      body:not([data-wiki-mode="league"]):not([data-wiki-mode="pokemon"]) .mw-body-content .navbox {
        border: 1px solid #ced6e0;
        background: #f8fafc;
      }
      .mw-body-content .thumbcaption,
      .mw-body-content figcaption {
        font-size: 0.78rem;
        color: #333;
        line-height: 1.35;
      }
      .mw-body-content .gallery {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 0.6rem;
      }
      .mw-body-content .gallery .gallerybox {
        margin: 0;
      }
      ${fandomChromeHideCss}
      ${marvelReaderCss}
      ${leagueReaderCss}
      ${minecraftReaderCss}
      ${pokemonReaderCss}
      ${needsReaderScrollFix ? EMBEDDED_WIKI_READER_SCROLL_FIX_CSS : ""}
      @media (max-width: 640px) {
        body:not([data-wiki-mode="league"]):not([data-wiki-mode="pokemon"]) .page-layout {
          display: block;
        }
        body:not([data-wiki-mode="league"]):not([data-wiki-mode="pokemon"]) .page-toc {
          position: static;
          width: auto;
          margin-bottom: 12px;
        }
        body[data-wiki-mode="league"] .page-toc {
          width: 180px;
          flex: 0 0 180px;
        }
        main {
          padding: 0 6px 12px;
        }
        .mw-body-content .infobox,
        .mw-body-content .notaninfobox,
        .mw-body-content table.infobox,
        .mw-body-content table.roundy.infobox,
        .mw-body-content .roundy.infobox {
          float: none;
          margin: 0 0 0.8rem;
          width: 100%;
          max-width: 100%;
        }
      }
    </style>
  </head>
  <body class="${isMinecraftMode || isPokemonMode ? `skin-vector mediawiki ltr client-js${isPokemonMode ? " bulbapedia-reader" : ""}` : ""}" data-wiki-mode="${resolvedMode}">
    ${pokemonChromeHtml}
    ${pageMainHtml}
    ${pokemonChromeFooter}
    ${needsReaderScrollFix ? `<style id="wikirush-embedded-scroll-fix">${EMBEDDED_WIKI_READER_SCROLL_FIX_CSS}</style>` : ""}
    <script>
      (() => {
        const headingSelector = "h2, h3, h4, .mw-heading2 > h2, .mw-heading3 > h3, .mw-heading4 > h4";
        const headingQuery = headingSelector
          .split(",")
          .map((part) => ".mw-body-content " + part.trim())
          .join(", ");
        const tocContainer = document.querySelector("[data-page-toc]");
        const tocRoot = document.querySelector("[data-toc-root]");
        const tocToggle = document.querySelector("[data-toc-toggle]");
        const pageLayout = document.querySelector(".page-layout");
        const isLeagueMode = document.body.dataset.wikiMode === "league";
        const leagueGeneratedTocMinHeadings = 4;

        const syncTocLayout = (visible) => {
          if (!(pageLayout instanceof HTMLElement)) {
            return;
          }
          pageLayout.classList.toggle("page-layout--no-toc", !visible);
        };

        syncTocLayout(false);

        const slugify = (text) =>
          text
            .toLowerCase()
            .trim()
            .replace(/\\[[^\\]]+\\]/g, "")
            .replace(/[^\\p{L}\\p{N}\\s-]/gu, "")
            .replace(/\\s+/g, "-")
            .replace(/-+/g, "-");

        const ensureHeadingId = (heading, index) => {
          if (heading.id) {
            return heading.id;
          }
          const rawText = heading.textContent || "section";
          let nextId = slugify(rawText) || "section-" + (index + 1);
          let suffix = 2;
          while (document.getElementById(nextId)) {
            nextId = (slugify(rawText) || "section-" + (index + 1)) + "-" + suffix;
            suffix += 1;
          }
          heading.id = nextId;
          return nextId;
        };

        const buildGeneratedToc = () => {
          if (!(tocContainer instanceof HTMLElement) || !(tocRoot instanceof HTMLElement)) {
            return;
          }

          const headings = Array.from(document.querySelectorAll(headingQuery))
            .filter((heading) =>
              !heading.closest(".navbox, table.infobox, .roundy.infobox, .portable-infobox, .reflist, .toc, #toc, .page-toc, [data-page-toc]"),
            )
            .filter((heading, index, all) => all.indexOf(heading) === index);

          if (headings.length === 0) {
            tocContainer.hidden = true;
            syncTocLayout(false);
            return;
          }

          if (isLeagueMode && headings.length < leagueGeneratedTocMinHeadings) {
            tocContainer.hidden = true;
            syncTocLayout(false);
            return;
          }

          tocContainer.hidden = false;
          syncTocLayout(true);
          tocRoot.replaceChildren();

          const topItem = document.createElement("li");
          topItem.className = "page-toc-item";
          const topLine = document.createElement("div");
          topLine.className = "page-toc-line";
          const topLink = document.createElement("a");
          topLink.className = "page-toc-link";
          topLink.href = "#";
          topLink.textContent = "(Top)";
          topLine.appendChild(topLink);
          topItem.appendChild(topLine);
          tocRoot.appendChild(topItem);

          const stack = [{ level: 1, list: tocRoot, item: null }];

          headings.forEach((heading, index) => {
            const tagLevel = Number(heading.tagName.slice(1));
            const level = Number.isFinite(tagLevel) ? tagLevel : 2;
            const id = ensureHeadingId(heading, index);
            const text = (heading.textContent || "").replace(/\\[[^\\]]+\\]/g, "").trim();
            if (!text) {
              return;
            }

            while (stack.length > 1 && level <= stack[stack.length - 1].level) {
              stack.pop();
            }

            const parent = stack[stack.length - 1];
            let currentList = parent.list;

            if (level > parent.level + 1) {
              for (let fill = parent.level + 1; fill < level; fill += 1) {
                const phantomItem = document.createElement("li");
                phantomItem.className = "page-toc-item";
                const phantomList = document.createElement("ul");
                phantomList.className = "page-toc-sublist";
                phantomItem.appendChild(phantomList);
                currentList.appendChild(phantomItem);
                currentList = phantomList;
              }
            }

            const item = document.createElement("li");
            item.className = "page-toc-item";

            const line = document.createElement("div");
            line.className = "page-toc-line";

            const link = document.createElement("a");
            link.className = "page-toc-link";
            link.href = "#" + id;
            link.textContent = text;

            line.appendChild(link);
            item.appendChild(line);
            currentList.appendChild(item);

            const childList = document.createElement("ul");
            childList.className = "page-toc-sublist";
            item.appendChild(childList);
            stack.push({ level, list: childList, item });
          });

          const items = Array.from(tocRoot.querySelectorAll(".page-toc-item"));
          items.forEach((item) => {
            const childList = item.querySelector(":scope > .page-toc-sublist");
            const line = item.querySelector(":scope > .page-toc-line");
            if (!(childList instanceof HTMLElement) || !(line instanceof HTMLElement)) {
              return;
            }
            if (childList.children.length === 0) {
              childList.remove();
              return;
            }

            const arrow = document.createElement("button");
            arrow.type = "button";
            arrow.className = "page-toc-arrow";
            arrow.textContent = "▾";
            arrow.setAttribute("aria-expanded", "true");

            arrow.addEventListener("click", () => {
              const expanded = arrow.getAttribute("aria-expanded") === "true";
              arrow.setAttribute("aria-expanded", expanded ? "false" : "true");
              arrow.textContent = expanded ? "▸" : "▾";
              childList.hidden = expanded;
            });

            line.prepend(arrow);
          });
        };

        const normalizeTocList = (rootList) => {
          if (!(rootList instanceof HTMLElement)) {
            return;
          }
          rootList.querySelectorAll("a").forEach((anchor) => {
            if (!(anchor instanceof HTMLAnchorElement)) {
              return;
            }
            anchor.classList.add("page-toc-link");
            const href = anchor.getAttribute("href") || "";
            const hashIndex = href.indexOf("#");
            if (hashIndex >= 0) {
              anchor.setAttribute("href", href.slice(hashIndex) || "#");
            }
          });
        };

        const hydrateExistingToc = () => {
          if (!(tocContainer instanceof HTMLElement) || !(tocRoot instanceof HTMLElement)) {
            return false;
          }
          const existingToc =
            document.querySelector(".mw-body-content #toc > ul") ||
            document.querySelector(".mw-body-content .toc > ul");
          if (!(existingToc instanceof HTMLElement)) {
            return false;
          }

          tocRoot.replaceChildren();
          tocRoot.appendChild(existingToc.cloneNode(true));
          normalizeTocList(tocRoot);
          tocContainer.hidden = false;
          syncTocLayout(true);
          document
            .querySelectorAll(".mw-body-content #toc, .mw-body-content .toc")
            .forEach((node) => {
              if (node instanceof HTMLElement) {
                node.style.display = "none";
              }
            });
          return true;
        };

        const wrapWideTables = () => {
          if (document.body.dataset.wikiMode === "pokemon") {
            return;
          }
          const tables = Array.from(document.querySelectorAll(".mw-body-content table"));
          tables.forEach((table) => {
            if (!(table instanceof HTMLTableElement)) {
              return;
            }
            if (table.closest(".infobox, .roundy.infobox, table.infobox, .portable-infobox, .navbox, .navbox-wrapper")) {
              return;
            }
            if (table.classList.contains("navbox")) {
              return;
            }
            const parent = table.parentElement;
            if (parent && parent.classList.contains("table-scroll")) {
              return;
            }
            const wrapper = document.createElement("div");
            wrapper.className = "table-scroll";
            parent?.insertBefore(wrapper, table);
            wrapper.appendChild(table);
          });
        };

        wrapWideTables();
        const useInlineWikiToc =
          document.body.dataset.wikiMode === "minecraft" ||
          document.body.dataset.wikiMode === "marvel" ||
          document.body.dataset.wikiMode === "pokemon";
        if (useInlineWikiToc) {
          if (tocContainer instanceof HTMLElement) {
            tocContainer.hidden = true;
          }
          syncTocLayout(false);
        } else if (!hydrateExistingToc()) {
          buildGeneratedToc();
        } else if (tocContainer instanceof HTMLElement && tocContainer.hidden) {
          syncTocLayout(false);
        }

        const initPiCollapsibles = () => {
          const groups = Array.from(document.querySelectorAll(".portable-infobox .pi-collapse"));
          groups.forEach((group) => {
            if (!(group instanceof HTMLElement) || group.dataset.piBound === "true") {
              return;
            }
            group.dataset.piBound = "true";
            const header = group.querySelector(":scope > .pi-header, :scope > h2.pi-header");
            if (!(header instanceof HTMLElement)) {
              return;
            }
            header.addEventListener("click", (event) => {
              event.preventDefault();
              const isClosed = group.classList.contains("pi-collapse-closed");
              group.classList.toggle("pi-collapse-closed", !isClosed);
              group.classList.toggle("pi-collapse-open", isClosed);
            });
          });
        };

        initPiCollapsibles();

        const initCollapsibles = () => {
          const collapsibles = Array.from(document.querySelectorAll(".mw-collapsible"));
          collapsibles.forEach((element) => {
            if (!(element instanceof HTMLElement) || element.classList.contains("mw-made-collapsible")) {
              return;
            }

            element.classList.add("mw-made-collapsible");
            const expandText = element.getAttribute("data-expandtext") || "show";
            const collapseText = element.getAttribute("data-collapsetext") || "hide";
            const header =
              element.querySelector(":scope > .mw-collapsible-header") ??
              element.querySelector(":scope > caption") ??
              element.querySelector(":scope > tr > th");

            const toggle = document.createElement("a");
            toggle.className = "mw-collapsible-toggle";
            toggle.href = "#";
            toggle.textContent = element.classList.contains("mw-collapsed")
              ? "[" + expandText + "]"
              : "[" + collapseText + "]";

            const setCollapsed = (collapsed) => {
              element.classList.toggle("mw-collapsed", collapsed);
              toggle.textContent = collapsed ? "[" + expandText + "]" : "[" + collapseText + "]";
            };

            toggle.addEventListener("click", (event) => {
              event.preventDefault();
              setCollapsed(!element.classList.contains("mw-collapsed"));
            });

            if (header instanceof HTMLElement) {
              if (!header.querySelector(".mw-collapsible-toggle")) {
                header.appendChild(toggle);
              }
            } else {
              element.insertBefore(toggle, element.firstChild);
            }
          });
        };

        initCollapsibles();

        const initSiteCollapsibles = () => {
          const collapsibles = Array.from(document.querySelectorAll(".collapsible"));
          collapsibles.forEach((element) => {
            if (!(element instanceof HTMLElement) || element.dataset.madeCollapsible === "true") {
              return;
            }
            element.dataset.madeCollapsible = "true";

            const expandText = element.getAttribute("data-expandtext") || "show";
            const collapseText = element.getAttribute("data-collapsetext") || "hide";

            let toggleContainer = null;
            if (element.tagName === "TABLE") {
              const firstRow =
                element.querySelector(":scope > thead > tr") ??
                element.querySelector(":scope > tbody > tr") ??
                element.querySelector(":scope > tr");
              if (!(firstRow instanceof HTMLElement)) {
                return;
              }
              const cells = firstRow.querySelectorAll(":scope > th, :scope > td");
              toggleContainer = cells[cells.length - 1] ?? firstRow;
            } else {
              toggleContainer = element.firstElementChild;
              if (
                toggleContainer instanceof HTMLElement &&
                toggleContainer.classList.contains("collapsible-content")
              ) {
                toggleContainer = element;
              }
            }

            if (!(toggleContainer instanceof HTMLElement)) {
              return;
            }

            const toggle = document.createElement("span");
            toggle.className = "collapsetoggle";
            const link = document.createElement("span");
            link.className = "jslink";
            link.tabIndex = 0;
            toggle.append("[", link, "]");

            const setCollapsed = (collapsed) => {
              element.classList.toggle("collapsed", collapsed);
              link.textContent = collapsed ? expandText : collapseText;
            };

            link.textContent = element.classList.contains("collapsed") ? expandText : collapseText;

            const onActivate = (event) => {
              if (event.type === "keydown" && event.key !== "Enter") {
                return;
              }
              const target = event.target;
              if (target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement) {
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              setCollapsed(!element.classList.contains("collapsed"));
            };

            link.addEventListener("click", onActivate);
            link.addEventListener("keydown", onActivate);

            const inlineToggle =
              element.classList.contains("collapsetoggle-inline") ||
              element.classList.contains("collapse-button-none");
            if (toggleContainer !== element && inlineToggle) {
              toggleContainer.appendChild(toggle);
            } else {
              toggleContainer.prepend(toggle);
            }
          });
        };

        if (tocContainer instanceof HTMLElement && tocToggle instanceof HTMLButtonElement) {
          tocToggle.addEventListener("click", () => {
            const isCollapsed = tocContainer.getAttribute("aria-collapsed") === "true";
            tocContainer.setAttribute("aria-collapsed", isCollapsed ? "false" : "true");
            tocToggle.textContent = isCollapsed ? "hide" : "show";
          });
        }

        const postLink = (href) => {
          parent.postMessage({ source: "wikirush-wiki-frame", type: "link", href }, "*");
        };

        const postPrefetch = (href) => {
          parent.postMessage({ source: "wikirush-wiki-frame", type: "prefetch", href }, "*");
        };

        const absolutizeUrl = (value) => {
          if (!value) {
            return value;
          }
          try {
            return new URL(value, document.baseURI).toString();
          } catch {
            return value;
          }
        };

        const absolutizeSrcset = (srcset) => {
          if (!srcset) {
            return srcset;
          }
          return srcset
            .split(",")
            .map((entry) => {
              const trimmed = entry.trim();
              if (!trimmed) {
                return "";
              }
              const parts = trimmed.split(/\\s+/);
              const first = absolutizeUrl(parts[0]);
              return [first, ...parts.slice(1)].join(" ").trim();
            })
            .filter(Boolean)
            .join(", ");
        };

        // Some Fandom pages lazy-load with data-src/data-srcset; hydrate those
        // inside srcDoc so images render in the embedded reader.
        const hydrateLazyImages = () => {
          const images = Array.from(document.querySelectorAll("img"));
          images.forEach((image) => {
            if (!(image instanceof HTMLImageElement)) {
              return;
            }

            const dataSrc = image.getAttribute("data-src");
            const dataSrcset = image.getAttribute("data-srcset");
            const currentSrc = image.getAttribute("src") || "";
            const isPlaceholder =
              !currentSrc ||
              currentSrc.startsWith("data:image/") ||
              currentSrc.endsWith("/blank.gif") ||
              currentSrc.endsWith("/placeholder.png");

            if (dataSrc && isPlaceholder) {
              image.setAttribute("src", absolutizeUrl(dataSrc));
            }
            if (dataSrcset && !image.getAttribute("srcset")) {
              image.setAttribute("srcset", absolutizeSrcset(dataSrcset));
            }

            const liveSrc = image.getAttribute("src");
            const liveSrcset = image.getAttribute("srcset");
            if (liveSrc) {
              image.setAttribute("src", absolutizeUrl(liveSrc));
            }
            if (liveSrcset) {
              image.setAttribute("srcset", absolutizeSrcset(liveSrcset));
            }

            // Fandom CDN hotlink-protects assets unless Referer is absent or on-domain.
            image.referrerPolicy = "no-referrer";
          });

          const sources = Array.from(document.querySelectorAll("source"));
          sources.forEach((source) => {
            if (!(source instanceof HTMLSourceElement)) {
              return;
            }
            const srcset = source.getAttribute("srcset");
            const dataSrcset = source.getAttribute("data-srcset");
            if (srcset) {
              source.setAttribute("srcset", absolutizeSrcset(srcset));
            } else if (dataSrcset) {
              source.setAttribute("srcset", absolutizeSrcset(dataSrcset));
            }
            source.referrerPolicy = "no-referrer";
          });

          const media = Array.from(document.querySelectorAll("audio, video"));
          media.forEach((element) => {
            element.referrerPolicy = "no-referrer";
          });
        };

        const currentArticleTitle = ${JSON.stringify(title)};
        const articlePathPrefixes = ${JSON.stringify(wikiConfig.articlePathPrefixes)};

        const normalizeTitleKey = (value) =>
          decodeURIComponent(String(value || ""))
            .replace(/_/g, " ")
            .trim()
            .toLowerCase();

        const currentArticleTitleKey = normalizeTitleKey(currentArticleTitle);

        const isTocLink = (link) =>
          Boolean(
            link.closest(".page-toc, #toc, .toc, [data-page-toc]"),
          );

        const extractTitleKeyFromHref = (href) => {
          const trimmed = href.trim();
          if (!trimmed || trimmed.startsWith("#")) {
            return null;
          }

          const hashIndex = trimmed.indexOf("#");
          const pathPart = hashIndex >= 0 ? trimmed.slice(0, hashIndex) : trimmed;

          for (const prefix of articlePathPrefixes) {
            if (pathPart.startsWith(prefix)) {
              const rawTitle = pathPart.slice(prefix.length).split("?")[0]?.trim();
              return rawTitle ? normalizeTitleKey(rawTitle) : null;
            }
          }

          if (!/^https?:\\/\\//i.test(pathPart)) {
            return null;
          }

          try {
            const parsed = new URL(pathPart);
            for (const prefix of articlePathPrefixes) {
              if (parsed.pathname.startsWith(prefix)) {
                const rawTitle = parsed.pathname.slice(prefix.length).split("?")[0]?.trim();
                return rawTitle ? normalizeTitleKey(rawTitle) : null;
              }
            }
          } catch {
            return null;
          }

          return null;
        };

        const scrollToFragment = (hash) => {
          const raw = hash.startsWith("#") ? hash.slice(1) : hash;
          if (!raw) {
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
          }

          let id = raw;
          try {
            id = decodeURIComponent(raw);
          } catch {
            id = raw;
          }

          const target =
            document.getElementById(id) ||
            document.querySelector('[name="' + CSS.escape(id) + '"]');
          if (target instanceof HTMLElement) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        };

        const resolveFragmentLink = (href, link) => {
          const trimmed = (href || "").trim();
          if (!trimmed) {
            return null;
          }

          if (trimmed.startsWith("#")) {
            if (trimmed === "#" && !isTocLink(link)) {
              return null;
            }
            return trimmed;
          }

          const hashIndex = trimmed.indexOf("#");
          if (hashIndex < 0) {
            return null;
          }

          const fragment = trimmed.slice(hashIndex);
          if (fragment === "#") {
            return null;
          }

          if (isTocLink(link)) {
            return fragment;
          }

          const hrefTitleKey = extractTitleKeyFromHref(trimmed);
          if (hrefTitleKey && hrefTitleKey === currentArticleTitleKey) {
            return fragment;
          }

          return null;
        };

        document.addEventListener("click", (event) => {
          const target = event.target;
          if (!(target instanceof Element)) {
            return;
          }

          const link = target.closest("a[href]");
          if (!link) {
            return;
          }

          const href = link.getAttribute("href") || "";
          const fragment = resolveFragmentLink(href, link);
          if (fragment) {
            event.preventDefault();
            scrollToFragment(fragment);
            return;
          }

          if (href.startsWith("#")) {
            return;
          }
          postLink(href);

          event.preventDefault();
        });

        document.addEventListener("mouseover", (event) => {
          const target = event.target;
          if (!(target instanceof Element)) {
            return;
          }

          const link = target.closest("a[href]");
          if (!link) {
            return;
          }

          const href = link.getAttribute("href") || "";
          if (!href || href.startsWith("#") || resolveFragmentLink(href, link)) {
            return;
          }

          if (link.dataset.prefetchRequested === "true") {
            return;
          }
          link.dataset.prefetchRequested = "true";
          postPrefetch(href);
        });

        window.addEventListener("load", () => {
          hydrateLazyImages();
        });
        initSiteCollapsibles();
        hydrateLazyImages();
        ${isFandomMode ? `
        window.open = () => null;

        const fandomChromeSelectors = [
          ".global-navigation",
          ".global-explore-navigation",
          ".global-top-navigation",
          ".community-navigation",
          ".wds-global-navigation-wrapper",
          ".fandom-community-header",
          ".fandom-sticky-header",
          ".fandom-sticky-header-container",
          "#global-explore-navigation",
          "#WikiaBar",
          "#mixed-content-footer",
          ".global-footer",
          ".page-side-tools__wrapper",
          "#LightboxModal",
          ".wds-modal",
          ".wds-dialog",
          ".wds-overlay",
          "[role='dialog']",
          ".notifications",
          ".notifications-wrapper",
          ".top-ads-container",
          ".bottom-ads-container",
          ".explore-page",
          "[class*='explore-feed']",
          "[class*='ExploreCard']",
        ];

        const removeFandomChrome = () => {
          fandomChromeSelectors.forEach((selector) => {
            document.querySelectorAll(selector).forEach((node) => {
              if (node instanceof HTMLElement) {
                node.remove();
              }
            });
          });
        };

        removeFandomChrome();
        if (typeof MutationObserver !== "undefined") {
          const chromeObserver = new MutationObserver(removeFandomChrome);
          chromeObserver.observe(document.body, { childList: true, subtree: true });
        }
        ` : ""}
      })();
    </script>
  </body>
</html>`;
  }, [
    displayTitle,
    html,
    isFandomMode,
    isLeagueMode,
    isMarvelMode,
    isPokemonMode,
    isMinecraftMode,
    needsReaderScrollFix,
    resolvedMode,
    title,
    wikiConfig.baseUrl,
    wikiConfig.displayName,
    wikiConfig.reader.articleSubtitle,
    wikiStyleHrefs,
  ]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (
        !iframeRef.current ||
        event.source !== iframeRef.current.contentWindow
      ) {
        return;
      }

      const payload = event.data;
      if (!payload || payload.source !== "wikirush-wiki-frame") {
        return;
      }

      if (payload.type === "link" && typeof payload.href === "string") {
        if (disableInteraction) {
          return;
        }

        const nextTitle = extractInternalArticleTitle(payload.href, resolvedMode);
        if (!nextTitle) {
          return;
        }

        onInternalLinkClick(nextTitle);
        iframeRef.current?.contentWindow?.scrollTo({ top: 0, left: 0 });
        return;
      }

      if (payload.type === "prefetch" && typeof payload.href === "string" && onLinkHover) {
        const nextTitle = extractInternalArticleTitle(payload.href, resolvedMode);
        if (!nextTitle) {
          return;
        }

        onLinkHover(nextTitle);
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [disableInteraction, onInternalLinkClick, onLinkHover, resolvedMode]);

  useEffect(() => {
    const frameWindow = iframeRef.current?.contentWindow;
    if (!frameWindow) {
      return;
    }

    frameWindow.scrollTo({ top: 0, left: 0 });
  }, [title, html]);

  useEffect(() => {
    if (!needsReaderScrollFix || isLoading) {
      return;
    }

    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }

    let cleanupWheel: (() => void) | undefined;

    const bindWheel = () => {
      cleanupWheel?.();
      cleanupWheel = undefined;

      const frameWindow = iframe.contentWindow;
      const doc = iframe.contentDocument;
      if (!frameWindow || !doc) {
        return;
      }

      const onWheel = (event: WheelEvent) => {
        const scrollRoot = getEmbeddedWikiReaderScrollRoot(doc);
        if (applyEmbeddedWikiReaderWheelScroll(event, scrollRoot)) {
          event.preventDefault();
        }
      };

      frameWindow.addEventListener("wheel", onWheel, { passive: false, capture: true });
      cleanupWheel = () => frameWindow.removeEventListener("wheel", onWheel, { capture: true });
    };

    bindWheel();
    iframe.addEventListener("load", bindWheel);
    return () => {
      iframe.removeEventListener("load", bindWheel);
      cleanupWheel?.();
    };
  }, [html, isLoading, needsReaderScrollFix, title]);

  return (
    <article
      className={`race-wiki-shell flex min-h-0 w-full flex-1 flex-col ${
        isLeagueMode
          ? "bg-[#0a0e17] text-[#c9c9c9]"
          : isPokemonMode
            ? "mx-auto max-w-[1100px] bg-[#e4f3e4] text-[#202122]"
            : isMinecraftMode
              ? "bg-[#303030] text-[#202122]"
              : "bg-white text-[#202122]"
      }`}
    >
      {errorMessage ? (
        <div className="mt-4 border border-[#d33] bg-[#fee7e6] px-3 py-2 text-sm text-[#202122]">
          {errorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-5 space-y-3">
          <div className="h-4 w-2/3 animate-pulse rounded bg-[#eaecf0]" />
          <div className="h-4 w-full animate-pulse rounded bg-[#eaecf0]" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-[#eaecf0]" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-[#eaecf0]" />
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          className="race-wiki-content min-h-0 w-full flex-1 border-0"
          srcDoc={articleDocument}
          sandbox={iframeSandbox}
          scrolling="no"
          title={`${wikiConfig.reader.iframeTitlePrefix}: ${displayTitle || title}`}
          style={{
            backgroundColor: readerShellBackgroundColor,
          }}
          onLoad={() => {
            iframeRef.current?.contentWindow?.scrollTo({ top: 0, left: 0 });
          }}
        />
      )}
    </article>
  );
}
