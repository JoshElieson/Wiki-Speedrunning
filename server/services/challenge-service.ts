import { REDIS_KEYS } from "@/db/constants";
import { isDatabaseConfigured, isPrismaConfigError } from "@/lib/database";
import { cache } from "@/server/cache/cache";
import { ApiError } from "@/server/errors/api-error";
import {
  createChallenge,
  getChallengeById,
  getDailyChallengeByDateKey,
  getRandomActiveChallenge,
  setDailyChallenge,
} from "@/server/repositories/challenge-repository";
import { PROFILE_VARIETY_CATEGORIES } from "@/lib/profile-elo-categories";
import { VARIETY_DAILY_ARTICLE_POOLS } from "@/lib/variety-daily-pools";
import type {
  ChallengeDescriptor,
  DailyChallengeEntry,
  DailyChallengeMode,
  DailyChallengeSet,
  DailyVarietyChallengeEntry,
} from "@/types/domain";
import type { CreateChallengeRequest } from "../types/api";

type ChallengeSeed = {
  label: string;
  startTitle: string;
  targetTitle: string;
  difficultyScore: number;
};

const FALLBACK_SEEDS: ChallengeSeed[] = [
  { label: "Foundations", startTitle: "Internet", targetTitle: "Graph theory", difficultyScore: 42 },
  { label: "Culture Shift", startTitle: "Jazz", targetTitle: "Machine learning", difficultyScore: 58 },
  { label: "Space to Code", startTitle: "Mars", targetTitle: "TypeScript", difficultyScore: 66 },
  { label: "Policy Sprint", startTitle: "Democracy", targetTitle: "Cryptography", difficultyScore: 71 },
  { label: "Deep Dive", startTitle: "Quantum mechanics", targetTitle: "Compiler", difficultyScore: 82 },
];

const DAILY_ARTICLE_POOL = [
  "Internet",
  "Graph theory",
  "Machine learning",
  "Jazz",
  "Combinatorics",
  "Evolution",
  "Cryptography",
  "Programming language",
  "Data structure",
  "Probability",
  "World War II",
  "Renewable energy",
  "Computer network",
  "Moon",
  "Climate change",
  "Neural network",
  "Rocket",
  "Biodiversity",
  "Microprocessor",
  "Game theory",
  "History of mathematics",
  "Operating system",
  "Information theory",
  "Algebra",
  "Physics",
  "Linear algebra",
  "Video game",
  "Artificial intelligence",
  "Open source software",
  "Space exploration",
  "Music theory",
  "Chess",
  "Algorithm",
  "Network science",
  "Set theory",
  "Complex system",
  "Computer science",
  "World Wide Web",
  "Metallurgy",
  "Philosophy of science",
];

const DAILY_MODES: DailyChallengeMode[] = ["time", "clicks"];

const DAILY_MODE_OBJECTIVES: Record<DailyChallengeMode, string> = {
  time: "Reach the target as fast as possible!",
  clicks: "Reach the target in as few clicks as possible!",
};

function inferTier(score: number): ChallengeDescriptor["difficultyTier"] {
  if (score < 45) return "novice";
  if (score < 65) return "intermediate";
  if (score < 80) return "advanced";
  return "expert";
}

function fallbackChallenge(seed: ChallengeSeed, source: "daily" | "generated", id: string): ChallengeDescriptor {
  return {
    id,
    label: seed.label,
    startTitle: seed.startTitle,
    targetTitle: seed.targetTitle,
    difficultyScore: seed.difficultyScore,
    difficultyTier: inferTier(seed.difficultyScore),
    shortestPathHint: Math.max(2, Math.round(seed.difficultyScore / 20)),
    source,
  };
}

function pickFallbackGeneratedChallenge(): ChallengeDescriptor {
  const index = Math.floor(Math.random() * FALLBACK_SEEDS.length);
  return fallbackChallenge(FALLBACK_SEEDS[index], "generated", `generated-seed-${index}`);
}

export function getFallbackChallengeById(challengeId: string): ChallengeDescriptor | null {
  const match = /^generated-seed-(\d+)$/.exec(challengeId);
  if (!match) {
    return null;
  }

  const index = Number(match[1]);
  const seed = FALLBACK_SEEDS[index];
  if (!seed) {
    return null;
  }

  return fallbackChallenge(seed, "generated", challengeId);
}

function hashSeed(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }
  return hash >>> 0;
}

function seededRandom(seed: string): () => number {
  let state = hashSeed(seed) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function pickDailyPairFromPool(
  dateKey: string,
  seedSuffix: string,
  pool: string[],
  excludedPair?: string,
): { startTitle: string; targetTitle: string } {
  const random = seededRandom(`${dateKey}-${seedSuffix}`);
  const startTitle = pool[Math.floor(random() * pool.length)];
  let targetTitle = pool[Math.floor(random() * pool.length)];

  while (startTitle === targetTitle) {
    targetTitle = pool[Math.floor(random() * pool.length)];
  }

  if (excludedPair && `${startTitle}::${targetTitle}` === excludedPair) {
    targetTitle = pool[(pool.indexOf(targetTitle) + 1) % pool.length];
    if (targetTitle === startTitle) {
      targetTitle = pool[(pool.indexOf(targetTitle) + 1) % pool.length];
    }
  }

  return { startTitle, targetTitle };
}

function pickDailyPair(dateKey: string, mode: DailyChallengeMode, excludedPair?: string): { startTitle: string; targetTitle: string } {
  return pickDailyPairFromPool(dateKey, mode, DAILY_ARTICLE_POOL, excludedPair);
}

function buildDailyChallengeEntry(dateKey: string, mode: DailyChallengeMode, excludedPair?: string): DailyChallengeEntry {
  const pair = pickDailyPair(dateKey, mode, excludedPair);
  const random = seededRandom(`difficulty-${dateKey}-${mode}`);
  const difficultyScore = mode === "time" ? 50 + Math.floor(random() * 24) : 58 + Math.floor(random() * 26);
  const shortestPathHint = mode === "time" ? 3 + Math.floor(random() * 3) : 2 + Math.floor(random() * 3);

  const challenge: ChallengeDescriptor = {
    id: `daily-${mode}-${dateKey}`,
    label: mode === "time" ? "Daily Speed Challenge" : "Daily Efficiency Challenge",
    startTitle: pair.startTitle,
    targetTitle: pair.targetTitle,
    difficultyScore,
    difficultyTier: inferTier(difficultyScore),
    shortestPathHint,
    source: "daily",
  };

  return {
    mode,
    objective: DAILY_MODE_OBJECTIVES[mode],
    challenge,
  };
}

function buildVarietyDailyChallengeEntry(
  dateKey: string,
  scope: string,
  label: string,
  mode: DailyChallengeMode,
  excludedPair?: string,
): DailyChallengeEntry {
  const pool = VARIETY_DAILY_ARTICLE_POOLS[scope as keyof typeof VARIETY_DAILY_ARTICLE_POOLS];
  const pair = pickDailyPairFromPool(dateKey, `variety-${scope}-${mode}`, pool, excludedPair);
  const random = seededRandom(`difficulty-${dateKey}-variety-${scope}-${mode}`);
  const difficultyScore = mode === "time" ? 52 + Math.floor(random() * 24) : 58 + Math.floor(random() * 22);
  const shortestPathHint = mode === "time" ? 3 + Math.floor(random() * 3) : 2 + Math.floor(random() * 3);

  return {
    mode,
    objective: DAILY_MODE_OBJECTIVES[mode],
    challenge: {
      id: `daily-variety-${scope}-${mode}-${dateKey}`,
      label: mode === "time" ? `${label} Daily Speed Challenge` : `${label} Daily Efficiency Challenge`,
      startTitle: pair.startTitle,
      targetTitle: pair.targetTitle,
      difficultyScore,
      difficultyTier: inferTier(difficultyScore),
      shortestPathHint,
      source: "daily",
    },
  };
}

function buildVarietyDailyGroup(dateKey: string, scope: string, label: string): DailyVarietyChallengeEntry {
  const timeEntry = buildVarietyDailyChallengeEntry(dateKey, scope, label, "time");
  const firstPair = `${timeEntry.challenge.startTitle}::${timeEntry.challenge.targetTitle}`;
  const clicksEntry = buildVarietyDailyChallengeEntry(dateKey, scope, label, "clicks", firstPair);

  return {
    scope,
    label,
    challenges: [timeEntry, clicksEntry],
  };
}

function buildVarietyDailyChallenges(dateKey: string): DailyVarietyChallengeEntry[] {
  return PROFILE_VARIETY_CATEGORIES.map((category) =>
    buildVarietyDailyGroup(dateKey, category.scope, category.label),
  );
}

function hasCompleteVarietyChallenges(entries: DailyVarietyChallengeEntry[] | undefined): boolean {
  if (!entries?.length) {
    return false;
  }

  return (
    entries.length === PROFILE_VARIETY_CATEGORIES.length &&
    entries.every((entry) => entry.challenges?.length === DAILY_MODES.length)
  );
}

function varietyCategoryLabel(scope: string): string {
  return PROFILE_VARIETY_CATEGORIES.find((category) => category.scope === scope)?.label ?? scope;
}

function syncVarietyChallengeLabels(entries: DailyVarietyChallengeEntry[]): DailyVarietyChallengeEntry[] {
  return entries.map((entry) => {
    const label = varietyCategoryLabel(entry.scope);
    return {
      ...entry,
      label,
      challenges: entry.challenges.map((challengeEntry) => ({
        ...challengeEntry,
        challenge: {
          ...challengeEntry.challenge,
          label:
            challengeEntry.mode === "time"
              ? `${label} Daily Speed Challenge`
              : `${label} Daily Efficiency Challenge`,
        },
      })),
    };
  });
}

function varietyLabelsNeedSync(entries: DailyVarietyChallengeEntry[] | undefined): boolean {
  if (!entries?.length) {
    return false;
  }

  return entries.some((entry) => {
    const expectedLabel = varietyCategoryLabel(entry.scope);
    if (entry.label !== expectedLabel) {
      return true;
    }

    return entry.challenges.some((challengeEntry) => {
      const expectedChallengeLabel =
        challengeEntry.mode === "time"
          ? `${expectedLabel} Daily Speed Challenge`
          : `${expectedLabel} Daily Efficiency Challenge`;
      return challengeEntry.challenge.label !== expectedChallengeLabel;
    });
  });
}

function withVarietyChallenges(dailySet: DailyChallengeSet): DailyChallengeSet {
  const varietyChallenges = hasCompleteVarietyChallenges(dailySet.varietyChallenges)
    ? dailySet.varietyChallenges!
    : buildVarietyDailyChallenges(dailySet.dateKey);

  if (!varietyLabelsNeedSync(varietyChallenges)) {
    return dailySet;
  }

  return {
    ...dailySet,
    varietyChallenges: syncVarietyChallengeLabels(varietyChallenges),
  };
}

export async function createChallengeRecord(input: CreateChallengeRequest) {
  return createChallenge(input);
}

export async function fetchChallengeById(challengeId: string) {
  const fallback = getFallbackChallengeById(challengeId);
  if (fallback) {
    return fallback;
  }

  if (!isDatabaseConfigured()) {
    throw new ApiError(404, "CHALLENGE_NOT_FOUND", "Challenge not found");
  }

  try {
    return await getChallengeById(challengeId);
  } catch (error) {
    const fallbackAfterLookup = getFallbackChallengeById(challengeId);
    if (fallbackAfterLookup && isPrismaConfigError(error)) {
      return fallbackAfterLookup;
    }

    throw error;
  }
}

export async function getNextGeneratedChallenge(): Promise<ChallengeDescriptor> {
  if (isDatabaseConfigured()) {
    try {
      const persisted = await getRandomActiveChallenge();
      if (persisted) {
        return persisted;
      }
    } catch (error) {
      if (!isPrismaConfigError(error) && process.env.NODE_ENV === "production") {
        throw error;
      }

      console.warn("[challenge-service] Database unavailable; using built-in solo challenges.", error);
    }
  }

  return pickFallbackGeneratedChallenge();
}

export async function getDailyChallenge(date = new Date()): Promise<ChallengeDescriptor> {
  const dailySet = await getDailyChallenges(date);
  const speedEntry = dailySet.challenges.find((entry) => entry.mode === "time");
  if (!speedEntry) {
    throw new ApiError(500, "DAILY_CHALLENGE_UNAVAILABLE", "Daily speed challenge could not be generated");
  }
  return speedEntry.challenge;
}

export async function getDailyChallenges(date = new Date()): Promise<DailyChallengeSet> {
  const dateKey = date.toISOString().slice(0, 10);
  const cacheKey = REDIS_KEYS.daily(dateKey);
  const cached = await cache.get<DailyChallengeSet>(cacheKey);
  if (cached) {
    const dailySet = withVarietyChallenges(cached);
    if (dailySet !== cached) {
      await cache.set(cacheKey, dailySet, 24 * 60 * 60);
    }
    return dailySet;
  }

  const persisted = await getDailyChallengeByDateKey(dateKey);
  if (persisted) {
    const generatedClicks = buildDailyChallengeEntry(dateKey, "clicks", `${persisted.startTitle}::${persisted.targetTitle}`);
    const dailySet: DailyChallengeSet = {
      dateKey,
      challenges: [
        {
          mode: "time",
          objective: DAILY_MODE_OBJECTIVES.time,
          challenge: { ...persisted, id: `daily-time-${dateKey}`, label: "Daily Speed Challenge", source: "daily" },
        },
        generatedClicks,
      ],
      varietyChallenges: buildVarietyDailyChallenges(dateKey),
    };
    await cache.set(cacheKey, dailySet, 24 * 60 * 60);
    return dailySet;
  }

  const entries: DailyChallengeEntry[] = [];
  let firstPair: string | undefined;
  for (const mode of DAILY_MODES) {
    const entry = buildDailyChallengeEntry(dateKey, mode, firstPair);
    if (!firstPair) {
      firstPair = `${entry.challenge.startTitle}::${entry.challenge.targetTitle}`;
    }
    entries.push(entry);
  }

  const dailySet: DailyChallengeSet = {
    dateKey,
    challenges: entries,
    varietyChallenges: buildVarietyDailyChallenges(dateKey),
  };
  await cache.set(cacheKey, dailySet, 24 * 60 * 60);
  return dailySet;
}

export async function assignDailyChallenge(dateKey: string, challengeId: string) {
  if (!dateKey || !challengeId) {
    throw new ApiError(400, "INVALID_DAILY_ASSIGNMENT", "dateKey and challengeId are required");
  }

  await setDailyChallenge(dateKey, challengeId);
  const timeChallenge = await getChallengeById(challengeId);
  const clicksEntry = buildDailyChallengeEntry(dateKey, "clicks", `${timeChallenge.startTitle}::${timeChallenge.targetTitle}`);
  const dailySet: DailyChallengeSet = {
    dateKey,
    challenges: [
      {
        mode: "time",
        objective: DAILY_MODE_OBJECTIVES.time,
        challenge: {
          ...timeChallenge,
          id: `daily-time-${dateKey}`,
          label: "Daily Speed Challenge",
          source: "daily",
        },
      },
      clicksEntry,
    ],
    varietyChallenges: buildVarietyDailyChallenges(dateKey),
  };
  await cache.set(REDIS_KEYS.daily(dateKey), dailySet, 24 * 60 * 60);
}
