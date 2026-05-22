import type {
  GhostComparison,
  GhostRun,
  GhostStep,
  RacePerformanceSnapshot,
  ReplayStatus,
  ReplayTimeline,
  ReplayTimelineEntry,
} from "../types/ghost-race";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getCurrentGhostStep(ghostRun: GhostRun, elapsedMs: number): GhostStep | null {
  if (!ghostRun.steps.length || elapsedMs < 0) {
    return null;
  }

  let currentStep: GhostStep | null = null;
  for (const step of ghostRun.steps) {
    if (step.elapsedMs <= elapsedMs) {
      currentStep = step;
    } else {
      break;
    }
  }
  return currentStep;
}

export function isGhostFinished(ghostRun: GhostRun, elapsedMs: number): boolean {
  return elapsedMs >= ghostRun.durationMs;
}

export function computeGhostProgressPercent(ghostRun: GhostRun, elapsedMs: number): number {
  if (!ghostRun.steps.length) {
    return 0;
  }

  if (isGhostFinished(ghostRun, elapsedMs)) {
    return 100;
  }

  const currentStep = getCurrentGhostStep(ghostRun, elapsedMs);
  if (!currentStep) {
    return 0;
  }

  const maxIndex = Math.max(ghostRun.steps.length - 1, 1);
  const stepProgress = (currentStep.stepIndex / maxIndex) * 100;
  return clamp(stepProgress, 0, 99.9);
}

export function compareUserAgainstGhost(
  userPerformance: RacePerformanceSnapshot,
  ghostRun: Pick<GhostRun, "durationMs" | "clickCount">,
): GhostComparison {
  const timeDeltaMs = userPerformance.elapsedMs - ghostRun.durationMs;
  const clickDelta = userPerformance.clickCount - ghostRun.clickCount;
  return {
    timeDeltaMs,
    clickDelta,
    isAheadOnTime: timeDeltaMs <= 0,
    isAheadOnClicks: clickDelta <= 0,
  };
}

export function sortGhostRunsByFinishTime(ghostRuns: GhostRun[]): GhostRun[] {
  return [...ghostRuns].sort((a, b) => a.durationMs - b.durationMs);
}

export function selectBestGhostRun(ghostRuns: GhostRun[]): GhostRun | null {
  return sortGhostRunsByFinishTime(ghostRuns)[0] ?? null;
}

export function selectMedianGhostRun(ghostRuns: GhostRun[]): GhostRun | null {
  if (!ghostRuns.length) {
    return null;
  }

  const sorted = sortGhostRunsByFinishTime(ghostRuns);
  const middleIndex = Math.floor((sorted.length - 1) / 2);
  return sorted[middleIndex] ?? null;
}

export function selectRandomGhostRun(ghostRuns: GhostRun[], seed = 0): GhostRun | null {
  if (!ghostRuns.length) {
    return null;
  }

  const seeded = Math.abs(Math.floor(seed)) % ghostRuns.length;
  return ghostRuns[seeded] ?? null;
}

export function getReplayStatus(ghostRun: GhostRun, elapsedMs: number): ReplayStatus {
  if (elapsedMs <= 0) {
    return "waiting";
  }

  if (isGhostFinished(ghostRun, elapsedMs)) {
    return "finished";
  }

  return "racing";
}

export function buildReplayTimeline(ghostRun: GhostRun): ReplayTimeline {
  const entries: ReplayTimelineEntry[] = ghostRun.steps.map((step) => ({
    elapsedMs: step.elapsedMs,
    status: getReplayStatus(ghostRun, step.elapsedMs),
    currentStep: step,
    progressPercent: computeGhostProgressPercent(ghostRun, step.elapsedMs),
    clickCount: step.stepIndex,
  }));

  return {
    runId: ghostRun.id,
    challengeId: ghostRun.challengeId,
    status: "waiting",
    entries,
  };
}
