"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

const STORAGE_KEY = "wikirush.race-hud-position";
const PANEL_INSET = 12;

function getBoundsSize(boundsRef?: RefObject<HTMLElement | null>) {
  const container = boundsRef?.current;
  if (container) {
    return { width: container.clientWidth, height: container.clientHeight };
  }

  return { width: window.innerWidth, height: window.innerHeight };
}

function defaultPositionForPanel(panelWidth: number, boundsRef?: RefObject<HTMLElement | null>): Point {
  const { width } = getBoundsSize(boundsRef);
  return {
    x: Math.max(PANEL_INSET, width - panelWidth - PANEL_INSET),
    y: PANEL_INSET,
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

function clampToBounds(
  position: Point,
  panelWidth: number,
  panelHeight: number,
  boundsRef?: RefObject<HTMLElement | null>,
): Point {
  const { width, height } = getBoundsSize(boundsRef);
  const maxX = Math.max(0, width - panelWidth);
  const maxY = Math.max(0, height - panelHeight);

  return {
    x: Math.min(Math.max(0, position.x), maxX),
    y: Math.min(Math.max(0, position.y), maxY),
  };
}

function applyPanelTransform(panel: HTMLElement, position: Point) {
  panel.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
}

export function useDraggablePanelPosition(boundsRef?: RefObject<HTMLElement | null>) {
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
    const clamped = clampToBounds(position, rect.width, rect.height, boundsRef);
    positionRef.current = clamped;
    applyPanelTransform(panel, clamped);
    return clamped;
  }, [boundsRef]);

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
    const initial = positionRef.current ?? defaultPositionForPanel(rect.width, boundsRef);
    syncPanelTransform(initial);
  }, [boundsRef, syncPanelTransform]);

  useEffect(() => {
    const onResize = () => {
      const panel = panelRef.current;
      if (!panel) {
        return;
      }

      const rect = panel.getBoundingClientRect();
      syncPanelTransform(positionRef.current ?? defaultPositionForPanel(rect.width, boundsRef));
    };

    window.addEventListener("resize", onResize);

    const container = boundsRef?.current;
    const resizeObserver =
      container && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(onResize)
        : null;
    if (container && resizeObserver) {
      resizeObserver.observe(container);
    }

    return () => {
      window.removeEventListener("resize", onResize);
      resizeObserver?.disconnect();
    };
  }, [boundsRef, syncPanelTransform]);

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
      const position = positionRef.current ?? defaultPositionForPanel(rect.width, boundsRef);
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
          const next = clampToBounds(
            {
              x: activeDrag.originX + (moveEvent.clientX - activeDrag.startX),
              y: activeDrag.originY + (moveEvent.clientY - activeDrag.startY),
            },
            rect.width,
            rect.height,
            boundsRef,
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
    [boundsRef, endDrag],
  );

  const reclampPosition = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const rect = panel.getBoundingClientRect();
    const position = positionRef.current ?? defaultPositionForPanel(rect.width, boundsRef);
    syncPanelTransform(position);
  }, [boundsRef, syncPanelTransform]);

  return {
    panelRef,
    isDragging,
    onDragHandlePointerDown,
    reclampPosition,
  };
}
