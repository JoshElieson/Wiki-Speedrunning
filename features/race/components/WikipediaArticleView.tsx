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
      .mw-body-content img {
        max-width: 100%;
        height: auto;
      }
      .mw-body-content table {
        max-width: 100%;
      }
      @media (max-width: 640px) {
        .page-layout {
          display: block;
        }
        .page-toc {
          position: static;
          width: auto;
          margin-bottom: 12px;
        }
        main {
          padding: 0 6px 12px;
        }
      }
    </style>
  </head>
  <body>
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
          <p class="page-subtitle">From Wikipedia, the free encyclopedia</p>
          <div class="mw-body-content">
            ${html}
          </div>
        </div>
      </div>
    </main>
    <script>
      (() => {
        const headingSelector = "h2, h3, h4";
        const tocContainer = document.querySelector("[data-page-toc]");
        const tocRoot = document.querySelector("[data-toc-root]");
        const tocToggle = document.querySelector("[data-toc-toggle]");

        const slugify = (text) =>
          text
            .toLowerCase()
            .trim()
            .replace(/\\[[^\\]]+\\]/g, "")
            .replace(/[^a-z0-9\\s-]/g, "")
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

        const buildToc = () => {
          if (!(tocContainer instanceof HTMLElement) || !(tocRoot instanceof HTMLElement)) {
            return;
          }

          const headings = Array.from(document.querySelectorAll(".mw-body-content " + headingSelector))
            .filter((heading) => !heading.closest(".navbox, table.infobox, .reflist"));

          if (headings.length === 0) {
            tocContainer.hidden = true;
            return;
          }

          tocContainer.hidden = false;
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

        buildToc();

        if (tocContainer instanceof HTMLElement && tocToggle instanceof HTMLButtonElement) {
          tocToggle.addEventListener("click", () => {
            const isCollapsed = tocContainer.getAttribute("aria-collapsed") === "true";
            tocContainer.setAttribute("aria-collapsed", isCollapsed ? "false" : "true");
            tocToggle.textContent = isCollapsed ? "hide" : "show";
          });
        }

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

      if (
        payload.type === "height" &&
        typeof payload.height === "number" &&
        Number.isFinite(payload.height)
      ) {
        setIframeHeight(
          Math.min(Math.max(Math.ceil(payload.height), 500), 4000),
        );
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
