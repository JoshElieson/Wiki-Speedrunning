export type ReplayStatus = "waiting" | "racing" | "finished";

export interface GhostStep {
  articleTitle: string;
  normalizedArticleTitle: string;
  stepIndex: number;
  elapsedMs: number;
  articleUrl?: string;
}

export interface GhostParticipant {
  id: string;
  username: string;
  avatarUrl?: string;
  initials: string;
  accentColor?: string;
}

export interface GhostRun {
  id: string;
  challengeId: string;
  challengeSlug: string;
  participant: GhostParticipant;
  durationMs: number;
  clickCount: number;
  route: string[];
  steps: GhostStep[];
  startedAtIso: string;
  finishedAtIso: string;
}

interface BaseRaceParticipant {
  id: string;
  username: string;
  avatarUrl?: string;
  initials: string;
}

export interface CurrentUserRaceParticipant extends BaseRaceParticipant {
  type: "current-user";
  userId: string;
}

export interface GhostRaceParticipant extends BaseRaceParticipant {
  type: "ghost";
  ghostRunId: string;
}

export interface LiveRaceParticipant extends BaseRaceParticipant {
  type: "live";
  userId: string;
  connectionState: "connecting" | "connected" | "disconnected";
}

export type RaceParticipant = CurrentUserRaceParticipant | GhostRaceParticipant | LiveRaceParticipant;

export interface ReplayTimelineEntry {
  elapsedMs: number;
  status: ReplayStatus;
  currentStep: GhostStep | null;
  progressPercent: number;
  clickCount: number;
}

export interface ReplayTimeline {
  runId: string;
  challengeId: string;
  status: ReplayStatus;
  entries: ReplayTimelineEntry[];
}

export interface RacePerformanceSnapshot {
  elapsedMs: number;
  clickCount: number;
}

export interface GhostComparison {
  timeDeltaMs: number;
  clickDelta: number;
  isAheadOnTime: boolean;
  isAheadOnClicks: boolean;
}
