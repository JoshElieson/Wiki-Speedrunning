export type DifficultyTier = "novice" | "intermediate" | "advanced" | "expert";

export interface WikiArticleLink {
  title: string;
  normalizedTitle: string;
}

export interface WikiArticle {
  title: string;
  normalizedTitle: string;
  extract: string;
  links: WikiArticleLink[];
  url: string;
  pageId?: number;
}

export interface ChallengeDescriptor {
  id: string;
  label: string;
  startTitle: string;
  targetTitle: string;
  difficultyScore: number;
  difficultyTier: DifficultyTier;
  shortestPathHint?: number;
  source: "daily" | "generated";
}

export type DailyChallengeMode = "time" | "clicks";

export interface DailyChallengeEntry {
  mode: DailyChallengeMode;
  objective: string;
  challenge: ChallengeDescriptor;
}

export interface DailyChallengeSet {
  dateKey: string;
  challenges: DailyChallengeEntry[];
}

export interface RunStepInput {
  fromTitle: string;
  toTitle: string;
  clickedAtOffsetMs: number;
}

export interface RunSubmission {
  challengeId: string;
  userId?: string;
  durationMs: number;
  clickCount: number;
  route: string[];
  steps: RunStepInput[];
}

export interface PersistedRun extends RunSubmission {
  id: string;
  score: number;
  createdAt: string;
}

export interface MoveValidationResult {
  isValid: boolean;
  completed: boolean;
  normalizedCurrentTitle: string;
  normalizedNextTitle: string;
  normalizedTargetTitle?: string;
  reason?: string;
}

export interface LeaderboardRow {
  rank: number;
  username: string;
  rating: number;
  bestTimeMs: number;
  runs: number;
}

export interface ProfileSnapshot {
  username: string;
  displayName: string;
  rating: number;
  bestTimeMs: number;
  totalRuns: number;
  wins: number;
  recentRuns: {
    id: string;
    challengeLabel: string;
    durationMs: number;
    clickCount: number;
    createdAt: string;
  }[];
}
