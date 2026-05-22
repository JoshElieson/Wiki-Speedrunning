"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { stripWikiDisambiguation } from "@/features/wiki/services/title-normalization";
import { formatDuration } from "@/utils/format";
import { Button } from "@/components/ui/button";
import { useDraggablePanelPosition } from "../hooks/use-draggable-panel-position";
import { cn } from "@/utils/cn";

const EXPANDED_STORAGE_KEY = "wikirush.race-hud-expanded";

function readExpandedPreference(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    return sessionStorage.getItem(EXPANDED_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

interface RaceHudProps {
  elapsedMs: number;
  clickCount: number;
  startTitle: string;
  targetTitle: string;
  onAbandon: () => void;
  disabled?: boolean;
}

export function RaceHud({
  elapsedMs,
  clickCount,
  startTitle,
  targetTitle,
  onAbandon,
  disabled = false,
}: RaceHudProps) {
  const startLabel = stripWikiDisambiguation(startTitle);
  const targetLabel = stripWikiDisambiguation(targetTitle);
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [pendingAbandon, setPendingAbandon] = useState(false);
  const { panelRef, isDragging, onDragHandlePointerDown, reclampPosition } = useDraggablePanelPosition();

  useEffect(() => {
    setMounted(true);
    setExpanded(readExpandedPreference());
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      reclampPosition();
    });
    return () => cancelAnimationFrame(frame);
  }, [expanded, mounted, reclampPosition]);

  useEffect(() => {
    if (!expanded) {
      setPendingAbandon(false);
    }
  }, [expanded]);

  const toggleExpanded = () => {
    setExpanded((value) => {
      const next = !value;
      try {
        sessionStorage.setItem(EXPANDED_STORAGE_KEY, String(next));
      } catch {
        // Ignore storage failures.
      }
      return next;
    });
  };

  const hud = (
    <div
      ref={panelRef}
      className={cn(
        "fixed left-0 top-0 z-[200] rounded border border-[#a2a9b1] bg-[#f8f9fa]/95 px-3 py-2 shadow-[0_6px_18px_rgba(0,0,0,0.16)] backdrop-blur-sm will-change-transform",
        expanded ? "w-[min(360px,calc(100vw-2rem))]" : "w-[min(260px,calc(100vw-2rem))]",
      )}
    >
      {expanded ? (
        <>
          <div
            aria-label="Race stats — drag to reposition"
            className={cn(
              "flex touch-none select-none items-center gap-2 rounded px-0.5 py-0.5 text-[#202122]",
              isDragging ? "cursor-grabbing" : "cursor-grab",
            )}
            onPointerDown={onDragHandlePointerDown}
          >
            <div className="pointer-events-none flex min-w-0 flex-1 items-center justify-between gap-3">
              <p className="text-sm font-medium">Time: {formatDuration(elapsedMs)}</p>
              <p className="text-sm font-medium">Clicks: {clickCount}</p>
            </div>
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls="race-hud-details"
              aria-label="Collapse race panel"
              className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded border border-[#a2a9b1] bg-white text-[#202122] hover:bg-[#eaecf0]"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleExpanded();
              }}
            >
              <ChevronUp size={16} aria-hidden />
            </button>
          </div>
          <div id="race-hud-details">
            <dl className="mt-2 grid grid-cols-2 gap-3 border-t border-[#c8ccd1] pt-2 text-[#202122]">
              <div className="min-w-0">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#54595d]">Start</dt>
                <dd className="truncate text-sm font-medium leading-snug" title={startTitle}>
                  {startLabel}
                </dd>
              </div>
              <div className="min-w-0 text-right">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#54595d]">Target</dt>
                <dd className="truncate text-sm font-semibold leading-snug text-[#3366cc]" title={targetTitle}>
                  {targetLabel}
                </dd>
              </div>
            </dl>
            {pendingAbandon ? (
              <div
                className="mt-2 space-y-2 rounded border border-[#c8ccd1] bg-white px-2.5 py-2"
                onPointerDown={(event) => event.stopPropagation()}
              >
                <p className="text-sm font-medium text-[#202122]">Are you sure?</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={disabled}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setPendingAbandon(false);
                    }}
                    className="h-8 flex-1 border-[#a2a9b1] bg-[#f8f9fa] text-[#202122] hover:bg-[#eaecf0]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={disabled}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setPendingAbandon(false);
                      onAbandon();
                    }}
                    className="h-8 flex-1 border-[#b77c70] bg-[#fdf2f0] text-[#7a3125] hover:bg-[#f8e3df]"
                  >
                    Yes, abandon
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setPendingAbandon(true);
                }}
                className="mt-2 h-8 w-full border-[#a2a9b1] bg-white text-[#202122] hover:bg-[#eaecf0]"
              >
                Abandon match
              </Button>
            )}
          </div>
        </>
      ) : (
        <div
          aria-label="Race target — drag to reposition"
          className={cn(
            "flex touch-none select-none items-center gap-2 rounded px-0.5 py-0.5 text-[#202122]",
            isDragging ? "cursor-grabbing" : "cursor-grab",
          )}
          onPointerDown={onDragHandlePointerDown}
        >
          <div className="pointer-events-none min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#54595d]">Target</p>
            <p className="truncate text-sm font-semibold leading-snug text-[#3366cc]" title={targetTitle}>
              {targetLabel}
            </p>
          </div>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls="race-hud-details"
            aria-label="Expand race panel"
            className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded border border-[#a2a9b1] bg-white text-[#202122] hover:bg-[#eaecf0]"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              toggleExpanded();
            }}
          >
            <ChevronDown size={16} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );

  if (!mounted) {
    return null;
  }

  return createPortal(hud, document.body);
}
