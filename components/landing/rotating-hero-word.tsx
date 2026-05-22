"use client";

import { MotionConfig, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { HeroRotatingWord } from "@/lib/profile-elo-categories";

const DEFAULT_INTERVAL_MS = 3200;
const SLIDE_DURATION_S = 0.55;

const slideTransition = {
  duration: SLIDE_DURATION_S,
  ease: [0.22, 1, 0.36, 1] as const,
};

type RotatingHeroWordProps = {
  words: HeroRotatingWord[];
  intervalMs?: number;
  className?: string;
};

export function RotatingHeroWord({
  words,
  intervalMs = DEFAULT_INTERVAL_MS,
  className,
}: RotatingHeroWordProps) {
  const [index, setIndex] = useState(0);
  const [lineHeight, setLineHeight] = useState(0);
  const [skipTransition, setSkipTransition] = useState(false);
  const measureRef = useRef<HTMLSpanElement>(null);

  const longestWord = useMemo(
    () =>
      words.reduce(
        (longest, item) => (item.word.length > longest.word.length ? item : longest),
        words[0] ?? { word: "", accentClass: "" },
      ),
    [words],
  );

  const loopWords = useMemo(() => (words.length > 1 ? [...words, words[0]] : words), [words]);
  const canAnimate = words.length > 1;
  const activeIndex = canAnimate ? index % words.length : 0;
  const yOffset = lineHeight > 0 ? -index * lineHeight : 0;

  useLayoutEffect(() => {
    const node = measureRef.current;
    if (!node) {
      return;
    }

    const updateLineHeight = () => {
      setLineHeight(node.offsetHeight);
    };

    updateLineHeight();

    const observer = new ResizeObserver(updateLineHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, [words, longestWord]);

  useEffect(() => {
    if (!canAnimate) {
      return;
    }

    const timer = window.setInterval(() => {
      setIndex((current) => current + 1);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [canAnimate, intervalMs]);

  const resetLoop = () => {
    if (index !== words.length) {
      return;
    }

    setSkipTransition(true);
    setIndex(0);
    window.requestAnimationFrame(() => setSkipTransition(false));
  };

  const activeWord = words[activeIndex] ?? words[0];

  return (
    <span
      className={`inline-grid align-baseline [grid-template-areas:stack] ${className ?? ""}`}
      aria-label={activeWord?.word}
      aria-live="polite"
      aria-atomic
    >
      <span className="invisible col-start-1 row-start-1 whitespace-nowrap [grid-area:stack]" aria-hidden="true">
        {longestWord.word}
      </span>
      <span className="col-start-1 row-start-1 h-[1.1em] overflow-hidden [grid-area:stack]">
        <MotionConfig reducedMotion="never">
          <motion.span
            className="flex flex-col will-change-transform"
            initial={false}
            animate={{ y: yOffset }}
            transition={skipTransition ? { duration: 0 } : slideTransition}
            onAnimationComplete={resetLoop}
          >
            {loopWords.map((item, wordIndex) => (
              <span
                key={`${item.word}-${wordIndex}`}
                ref={wordIndex === 0 ? measureRef : undefined}
                aria-hidden={wordIndex !== index}
                className={`block h-[1.1em] leading-[1.1em] whitespace-nowrap ${item.accentClass}`}
              >
                {item.word}
              </span>
            ))}
          </motion.span>
        </MotionConfig>
      </span>
    </span>
  );
}
