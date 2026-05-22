"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { extractInternalArticleTitle } from "@/features/wiki/services/wikiApi";

interface WikipediaArticleViewProps {
  title: string;
  displayTitle: string;
  html: string;
  isLoading: boolean;
  errorMessage: string | null;
  disableInteraction?: boolean;
  onInternalLinkClick: (title: string) => void;
}

export function WikipediaArticleView({
  title,
  displayTitle,
  html,
  isLoading,
  errorMessage,
  disableInteraction = false,
  onInternalLinkClick,
}: WikipediaArticleViewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(900);
  const WIKIPEDIA_STYLE_HREF =
    "https://en.wikipedia.org/w/load.php?lang=en&modules=mediawiki.skinning.content.parsoid%7Cmediawiki.skinning.interface%7Csite.styles%7Cskins.vector.styles%7Cext.wikimediamessages.styles%7Cext.cite.styles%7Cext.math.styles&only=styles&skin=vector";

  const articleDocument = useMemo(() => {
    const safeDisplayTitle = displayTitle || title;
    const escapedTitle = safeDisplayTitle
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="${WIKIPEDIA_STYLE_HREF}" />
    <style>
      body {
        margin: 0;
        background: #fff;
        color: #202122;
        font-family: sans-serif;
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
      .mw-body-content img {
        max-width: 100%;
        height: auto;
      }
      .mw-body-content table {
        max-width: 100%;
      }
      @media (max-width: 640px) {
        main {
          padding: 0 6px 12px;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <h1 class="page-title">${escapedTitle}</h1>
      <p class="page-subtitle">From Wikipedia, the free encyclopedia</p>
      <div class="mw-body-content">
        ${html}
      </div>
    </main>
    <script>
      (() => {
        const postHeight = () => {
          const height = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight
          );
          parent.postMessage({ source: "wikirush-wiki-frame", type: "height", height }, "*");
        };

        const postLink = (href) => {
          parent.postMessage({ source: "wikirush-wiki-frame", type: "link", href }, "*");
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
          postLink(href);

          const isInternalArticle =
            href.startsWith("/wiki/") || /^https?:\\/\\/([a-z-]+\\.)?wikipedia\\.org/i.test(href);
          if (isInternalArticle) {
            event.preventDefault();
          }
        });

        window.addEventListener("load", postHeight);
        window.addEventListener("resize", postHeight);
        if (typeof ResizeObserver !== "undefined") {
          const observer = new ResizeObserver(postHeight);
          observer.observe(document.body);
        }
        postHeight();
      })();
    </script>
  </body>
</html>`;
  }, [displayTitle, html, title]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) {
        return;
      }

      const payload = event.data;
      if (!payload || payload.source !== "wikirush-wiki-frame") {
        return;
      }

      if (payload.type === "height" && typeof payload.height === "number" && Number.isFinite(payload.height)) {
        setIframeHeight(Math.min(Math.max(Math.ceil(payload.height), 500), 4000));
        return;
      }

      if (payload.type === "link" && typeof payload.href === "string") {
        if (disableInteraction) {
          return;
        }

        const nextTitle = extractInternalArticleTitle(payload.href);
        if (!nextTitle) {
          return;
        }

        onInternalLinkClick(nextTitle);
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [disableInteraction, onInternalLinkClick]);

  return (
    <article className="race-wiki-shell w-full bg-white px-1 py-3 text-[#202122] sm:px-2">
      {errorMessage ? (
        <div className="mt-4 border border-[#d33] bg-[#fee7e6] px-3 py-2 text-sm text-[#202122]">{errorMessage}</div>
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
          className="race-wiki-content mt-2 w-full border-0"
          srcDoc={articleDocument}
          sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
          title={`Wikipedia article: ${displayTitle || title}`}
          style={{ minHeight: "500px", height: `${iframeHeight}px` }}
        />
      )}
    </article>
  );
}
