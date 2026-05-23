export const REDIS_KEYS = {
  article: (normalizedTitle: string) => `wiki:article:${normalizedTitle}`,
  links: (normalizedTitle: string) => `wiki:links:${normalizedTitle}`,
  daily: (dateKey: string) => `challenge:daily:v6:${dateKey}`,
  challenge: (challengeId: string) => `challenge:item:${challengeId}`,
  leaderboard: (scope: string) => `leaderboard:${scope}`,
  run: (runId: string) => `run:${runId}`,
  room: (roomId: string) => `race:active:${roomId}`,
};

export const DEFAULT_PAGE_SIZE = 20;
