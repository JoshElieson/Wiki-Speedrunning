"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "wikirush.race-hud-position";
const VIEWPORT_MARGIN = 24;

function defaultPositionForPanel(panelWidth: number): Point {
  return {
    x: Math.max(VIEWPORT_MARGIN, window.innerWidth - panelWidth - VIEWPORT_MARGIN),
    y: VIEWPORT_MARGIN,
  };
}

type Point = { x: number; y: number };

function readStoredPosition(): Point | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Point;
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function clampToViewport(position: Point, panelWidth: number, panelHeight: number): Point {
  const maxX = Math.max(0, window.innerWidth - panelWidth);
  const maxY = Math.max(0, window.innerHeight - panelHeight);

  return {
    x: Math.min(Math.max(0, position.x), maxX),
    y: Math.min(Math.max(0, position.y), maxY),
  };
}

function applyPanelTransform(panel: HTMLElement, position: Point) {
  panel.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
}

export function useDraggablePanelPosition() {
  const panelRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef<Point | null>(readStoredPosition());
  const dragRef = useRef<{ pointerId: number; originX: number; originY: number; startX: number; startY: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const syncPanelTransform = useCallback((position: Point) => {
    const panel = panelRef.current;
    if (!panel) {
      return position;
    }

    const rect = panel.getBoundingClientRect();
    const clamped = clampToViewport(position, rect.width, rect.height);
    positionRef.current = clamped;
    applyPanelTransform(panel, clamped);
    return clamped;
  }, []);

  const persistPosition = useCallback((next: Point) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage failures (private mode, quota, etc.).
    }
  }, []);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const rect = panel.getBoundingClientRect();
    const initial =
      positionRef.current ?? defaultPositionForPanel(rect.width);
    syncPanelTransform(initial);
  }, [syncPanelTransform]);

  useEffect(() => {
    const onResize = () => {
      const panel = panelRef.current;
      if (!panel || !positionRef.current) {
        return;
      }

      const rect = panel.getBoundingClientRect();
      syncPanelTransform(positionRef.current ?? defaultPositionForPanel(rect.width));
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [syncPanelTransform]);

  const endDrag = useCallback(() => {
    const panel = panelRef.current;
    dragRef.current = null;
    setIsDragging(false);

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (panel && positionRef.current) {
      const clamped = syncPanelTransform(positionRef.current);
      persistPosition(clamped);
    }
  }, [persistPosition, syncPanelTransform]);

  const onDragHandlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || dragRef.current) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const panel = panelRef.current;
      if (!panel) {
        return;
      }

      const rect = panel.getBoundingClientRect();
      const position = positionRef.current ?? defaultPositionForPanel(rect.width);
      positionRef.current = position;
      applyPanelTransform(panel, position);

      dragRef.current = {
        pointerId: event.pointerId,
        originX: position.x,
        originY: position.y,
        startX: event.clientX,
        startY: event.clientY,
      };
      setIsDragging(true);

      const onPointerMove = (moveEvent: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag || moveEvent.pointerId !== drag.pointerId) {
          return;
        }

        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
        }

        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          const targetPanel = panelRef.current;
          const activeDrag = dragRef.current;
          if (!targetPanel || !activeDrag) {
            return;
          }

          const rect = targetPanel.getBoundingClientRect();
          const next = clampToViewport(
            {
              x: activeDrag.originX + (moveEvent.clientX - activeDrag.startX),
              y: activeDrag.originY + (moveEvent.clientY - activeDrag.startY),
            },
            rect.width,
            rect.height
          );

          positionRef.current = next;
          applyPanelTransform(targetPanel, next);
        });
      };

      const onPointerEnd = (endEvent: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag || endEvent.pointerId !== drag.pointerId) {
          return;
        }

        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerEnd);
        window.removeEventListener("pointercancel", onPointerEnd);
        endDrag();
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerEnd);
      window.addEventListener("pointercancel", onPointerEnd);
    },
    [endDrag]
  );

  const reclampPosition = useCallback(() => {
    const panel = panelRef.current;
    if (!panel || !positionRef.current) {
      return;
    }

    syncPanelTransform(positionRef.current);
  }, [syncPanelTransform]);

  return {
    panelRef,
    isDragging,
    onDragHandlePointerDown,
    reclampPosition,
  };
}
