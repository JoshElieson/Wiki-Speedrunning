import { DEMO_GHOST_RUNS_BY_CHALLENGE_ID, DEMO_GHOST_RUNS_BY_CHALLENGE_SLUG } from "../data/demo-ghost-runs";
import type { GhostRun } from "../types/ghost-race";
import { selectBestGhostRun, sortGhostRunsByFinishTime } from "../utils/replay-utils";

export interface GhostRaceDataAdapter {
  fetchGhostRunsForChallenge(challengeId: string): Promise<GhostRun[]>;
  fetchPersonalBestGhostRun(challengeId: string, userId: string): Promise<GhostRun | null>;
  fetchDemoGhostRuns(challengeSlug: string): Promise<GhostRun[]>;
}

class MockGhostRaceAdapter implements GhostRaceDataAdapter {
  async fetchGhostRunsForChallenge(challengeId: string): Promise<GhostRun[]> {
    const runs = DEMO_GHOST_RUNS_BY_CHALLENGE_ID[challengeId] ?? [];
    return sortGhostRunsByFinishTime(runs);
  }

  async fetchPersonalBestGhostRun(challengeId: string, userId: string): Promise<GhostRun | null> {
    const runs = DEMO_GHOST_RUNS_BY_CHALLENGE_ID[challengeId] ?? [];
    const personalRuns = runs.filter((run) => run.participant.id === userId || run.participant.username === userId);
    return selectBestGhostRun(personalRuns);
  }

  async fetchDemoGhostRuns(challengeSlug: string): Promise<GhostRun[]> {
    const runs = DEMO_GHOST_RUNS_BY_CHALLENGE_SLUG[challengeSlug] ?? [];
    return sortGhostRunsByFinishTime(runs);
  }
}

export function createGhostRaceService(adapter: GhostRaceDataAdapter = new MockGhostRaceAdapter()): GhostRaceDataAdapter {
  return adapter;
}

const ghostRaceService = createGhostRaceService();

export async function fetchGhostRunsForChallenge(challengeId: string): Promise<GhostRun[]> {
  return ghostRaceService.fetchGhostRunsForChallenge(challengeId);
}

export async function fetchPersonalBestGhostRun(challengeId: string, userId: string): Promise<GhostRun | null> {
  return ghostRaceService.fetchPersonalBestGhostRun(challengeId, userId);
}

export async function fetchDemoGhostRuns(challengeSlug: string): Promise<GhostRun[]> {
  return ghostRaceService.fetchDemoGhostRuns(challengeSlug);
}
