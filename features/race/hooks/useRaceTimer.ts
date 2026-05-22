"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface RaceTimerControls {
  elapsedMs: number;
  isRunning: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useRaceTimer(initialElapsedMs = 0): RaceTimerControls {
  const [elapsedMs, setElapsedMs] = useState(initialElapsedMs);
  const [isRunning, setIsRunning] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const carryOverRef = useRef(initialElapsedMs);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const timer = window.setInterval(() => {
      if (startedAtRef.current === null) {
        return;
      }
      setElapsedMs(carryOverRef.current + (Date.now() - startedAtRef.current));
    }, 40);

    return () => window.clearInterval(timer);
  }, [isRunning]);

  const start = useCallback(() => {
    if (isRunning) {
      return;
    }
    startedAtRef.current = Date.now();
    setIsRunning(true);
  }, [isRunning]);

  const stop = useCallback(() => {
    if (!isRunning) {
      return;
    }
    const now = Date.now();
    const base = carryOverRef.current;
    const delta = startedAtRef.current === null ? 0 : now - startedAtRef.current;
    const nextElapsed = Math.max(base + delta, 0);
    carryOverRef.current = nextElapsed;
    setElapsedMs(nextElapsed);
    startedAtRef.current = null;
    setIsRunning(false);
  }, [isRunning]);

  const reset = useCallback(() => {
    carryOverRef.current = 0;
    startedAtRef.current = null;
    setElapsedMs(0);
    setIsRunning(false);
  }, []);

  return useMemo(
    () => ({
      elapsedMs,
      isRunning,
      start,
      stop,
      reset,
    }),
    [elapsedMs, isRunning, reset, start, stop],
  );
}
