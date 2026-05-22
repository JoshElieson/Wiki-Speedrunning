import type { GhostRun, GhostStep } from "../types/ghost-race";

function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, "_").toLowerCase();
}

function toArticleUrl(title: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, "_"))}`;
}

function buildGhostSteps(route: string[], elapsedTimelineMs: number[]): GhostStep[] {
  return route.map((articleTitle, index) => ({
    articleTitle,
    normalizedArticleTitle: normalizeTitle(articleTitle),
    stepIndex: index,
    elapsedMs: elapsedTimelineMs[index] ?? elapsedTimelineMs[elapsedTimelineMs.length - 1] ?? 0,
    articleUrl: toArticleUrl(articleTitle),
  }));
}

interface DemoGhostChallengeSet {
  challengeId: string;
  challengeSlug: string;
  startTitle: string;
  targetTitle: string;
  ghostRuns: GhostRun[];
}

const INTERNET_TO_GRAPH_THEORY: DemoGhostChallengeSet = {
  challengeId: "demo-challenge-internet-graph-theory",
  challengeSlug: "internet-to-graph-theory",
  startTitle: "Internet",
  targetTitle: "Graph theory",
  ghostRuns: [
    {
      id: "ghost-run-graphsprinter-internet-graph-theory",
      challengeId: "demo-challenge-internet-graph-theory",
      challengeSlug: "internet-to-graph-theory",
      participant: {
        id: "ghost-user-graphsprinter",
        username: "graphsprinter",
        initials: "GS",
        accentColor: "#5f7ea7",
      },
      durationMs: 46200,
      clickCount: 6,
      route: [
        "Internet",
        "Computer network",
        "Network theory",
        "Graph (discrete mathematics)",
        "Graph theory",
      ],
      steps: buildGhostSteps(
        [
          "Internet",
          "Computer network",
          "Network theory",
          "Graph (discrete mathematics)",
          "Graph theory",
        ],
        [0, 6200, 14700, 29500, 46200],
      ),
      startedAtIso: "2026-05-20T16:00:00.000Z",
      finishedAtIso: "2026-05-20T16:00:46.200Z",
    },
    {
      id: "ghost-run-linkhunter-internet-graph-theory",
      challengeId: "demo-challenge-internet-graph-theory",
      challengeSlug: "internet-to-graph-theory",
      participant: {
        id: "ghost-user-linkhunter",
        username: "linkhunter",
        initials: "LH",
        accentColor: "#7c6aa8",
      },
      durationMs: 53100,
      clickCount: 7,
      route: [
        "Internet",
        "World Wide Web",
        "Hyperlink",
        "Web crawler",
        "Graph traversal",
        "Graph theory",
      ],
      steps: buildGhostSteps(
        ["Internet", "World Wide Web", "Hyperlink", "Web crawler", "Graph traversal", "Graph theory"],
        [0, 8400, 17300, 26200, 38900, 53100],
      ),
      startedAtIso: "2026-05-19T09:31:00.000Z",
      finishedAtIso: "2026-05-19T09:31:53.100Z",
    },
    {
      id: "ghost-run-depthfirst-internet-graph-theory",
      challengeId: "demo-challenge-internet-graph-theory",
      challengeSlug: "internet-to-graph-theory",
      participant: {
        id: "ghost-user-depthfirst",
        username: "depthfirst",
        initials: "DF",
        accentColor: "#4e8b6f",
      },
      durationMs: 49800,
      clickCount: 5,
      route: ["Internet", "Data structure", "Tree (data structure)", "Graph theory"],
      steps: buildGhostSteps(["Internet", "Data structure", "Tree (data structure)", "Graph theory"], [0, 11100, 27800, 49800]),
      startedAtIso: "2026-05-18T12:11:00.000Z",
      finishedAtIso: "2026-05-18T12:11:49.800Z",
    },
  ],
};

const CHALLENGE_DEMO_SETS: DemoGhostChallengeSet[] = [INTERNET_TO_GRAPH_THEORY];

export const DEMO_GHOST_RUNS_BY_CHALLENGE_ID: Record<string, GhostRun[]> = Object.fromEntries(
  CHALLENGE_DEMO_SETS.map((set) => [set.challengeId, set.ghostRuns]),
);

export const DEMO_GHOST_RUNS_BY_CHALLENGE_SLUG: Record<string, GhostRun[]> = Object.fromEntries(
  CHALLENGE_DEMO_SETS.map((set) => [set.challengeSlug, set.ghostRuns]),
);
