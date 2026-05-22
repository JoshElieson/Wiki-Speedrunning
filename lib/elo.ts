export const DEFAULT_ELO = 1000;
export const WIKIPEDIA_AVERAGE_COMPLETION_ELO = 30;
export const WIKIPEDIA_MIN_COMPLETION_ELO = 10;
export const WIKIPEDIA_MAX_COMPLETION_ELO = 50;
export const WIKIPEDIA_ABANDON_ELO_DELTA = -15;

interface SoloEloDeltaInput {
  completed: boolean;
  timeMs?: number;
  clicks?: number;
}

/**
 * Stable solo ranked Wikipedia ELO model:
 * - Base completion gain is +30.
 * - Time and click adjustments reward stronger runs.
 * - Completion gain is always clamped to +10..+50.
 * - Abandon is always -15.
 */
export function calculateSoloEloDelta({ completed, timeMs = 0, clicks = 0 }: SoloEloDeltaInput): number {
  if (!completed) {
    return WIKIPEDIA_ABANDON_ELO_DELTA;
  }

  // Baselines represent an "average" completion in the current solo mode.
  const baselineTimeMs = 150_000;
  const baselineClicks = 7;

  // Faster times and fewer clicks each move rating by a bounded amount.
  const timeAdjustment = Math.max(-12, Math.min(12, Math.round((baselineTimeMs - timeMs) / 15_000)));
  const clickAdjustment = Math.max(-8, Math.min(8, (baselineClicks - clicks) * 2));

  return Math.max(
    WIKIPEDIA_MIN_COMPLETION_ELO,
    Math.min(WIKIPEDIA_MAX_COMPLETION_ELO, WIKIPEDIA_AVERAGE_COMPLETION_ELO + timeAdjustment + clickAdjustment),
  );
}
