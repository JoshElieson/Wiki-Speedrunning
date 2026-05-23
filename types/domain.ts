import type { EloByMode, StatsByMode } from "@/lib/mode-ratings";
import type { WikiModeId } from "@/lib/wiki-modes";

export type DifficultyTier = "novice" | "intermediate" | "advanced" | "expert";

export interface WikiArticleLink {
  title: string;
  normalizedTitle: string;
}

export interface WikiArticle {
  title: string;
  normalizedTitle: string;
  displayTitle: string;
  html: string;
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
  wikiId?: WikiModeId;
}

export type DailyChallengeMode = "time" | "clicks";

export interface DailyChallengeEntry {
  mode: DailyChallengeMode;
  objective: string;
  challenge: ChallengeDescriptor;
}

export interface DailyVarietyChallengeEntry {
  scope: string;
  label: string;
  challenges: DailyChallengeEntry[];
}

export interface DailyChallengeSet {
  dateKey: string;
  challenges: DailyChallengeEntry[];
  varietyChallenges: DailyVarietyChallengeEntry[];
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
  eloDelta: number;
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
  displayName?: string | null;
  rating: number;
  bestTimeMs: number;
  runs: number;
}

export interface ProfileCategoryElo {
  scope: string;
  label: string;
  rating: number;
}

export interface ProfileSnapshot {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  /** Wikipedia scope rating — same as `eloByMode.wikipedia`. */
  rating: number;
  eloByMode: EloByMode;
  statsByMode: StatsByMode;
  categoryElos: ProfileCategoryElo[];
  bestTimeMs: number;
  totalRuns: number;
  wins: number;
  recentRuns: {
    id: string;
    challengeLabel: string;
    wikiMode: WikiModeId;
    status: "COMPLETED" | "ABANDONED" | "DISQUALIFIED";
    durationMs: number;
    clickCount: number;
    score: number;
    eloDelta: number;
    difficultyScore: number;
    route: string[];
    createdAt: string;
  }[];
}
