import { useLayoutEffect, useRef, useState } from "react";

export function useViewportFitScale() {
  const containerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) {
      return;
    }

    let frame = 0;

    const updateScale = () => {
      content.style.transform = "";
      const available = container.clientHeight;
      const needed = content.scrollHeight;
      if (!needed) {
        return;
      }
      if (!available) {
        frame = window.requestAnimationFrame(updateScale);
        return;
      }

      const next = Math.min(1, available / needed);
      setScale(next);
      content.style.transform = next < 1 ? `scale(${next})` : "";
    };

    updateScale();

    const observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateScale);
    });
    observer.observe(container);
    observer.observe(content);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      content.style.transform = "";
    };
  }, []);

  return { containerRef, contentRef, scale };
}
