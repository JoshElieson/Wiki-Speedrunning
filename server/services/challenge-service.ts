import { REDIS_KEYS } from "@/db/constants";
import { cache } from "@/server/cache/cache";
import { ApiError } from "@/server/errors/api-error";
import {
  createChallenge,
  getChallengeById,
  getDailyChallengeByDateKey,
  getRandomActiveChallenge,
  setDailyChallenge,
} from "@/server/repositories/challenge-repository";
import type { ChallengeDescriptor, DailyChallengeEntry, DailyChallengeMode, DailyChallengeSet } from "@/types/domain";
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

function pickDailyPair(dateKey: string, mode: DailyChallengeMode, excludedPair?: string): { startTitle: string; targetTitle: string } {
  const random = seededRandom(`${dateKey}-${mode}`);
  const startTitle = DAILY_ARTICLE_POOL[Math.floor(random() * DAILY_ARTICLE_POOL.length)];
  let targetTitle = DAILY_ARTICLE_POOL[Math.floor(random() * DAILY_ARTICLE_POOL.length)];

  while (startTitle === targetTitle) {
    targetTitle = DAILY_ARTICLE_POOL[Math.floor(random() * DAILY_ARTICLE_POOL.length)];
  }

  if (excludedPair && `${startTitle}::${targetTitle}` === excludedPair) {
    targetTitle = DAILY_ARTICLE_POOL[(DAILY_ARTICLE_POOL.indexOf(targetTitle) + 1) % DAILY_ARTICLE_POOL.length];
    if (targetTitle === startTitle) {
      targetTitle = DAILY_ARTICLE_POOL[(DAILY_ARTICLE_POOL.indexOf(targetTitle) + 1) % DAILY_ARTICLE_POOL.length];
    }
  }

  return { startTitle, targetTitle };
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
    objective: mode === "time" ? "Fastest completion time wins." : "Fewest clicks wins.",
    challenge,
  };
}

export async function createChallengeRecord(input: CreateChallengeRequest) {
  return createChallenge(input);
}

export async function fetchChallengeById(challengeId: string) {
  return getChallengeById(challengeId);
}

export async function getNextGeneratedChallenge(): Promise<ChallengeDescriptor> {
  const persisted = await getRandomActiveChallenge();
  if (persisted) {
    return persisted;
  }

  const index = Math.floor(Math.random() * FALLBACK_SEEDS.length);
  return fallbackChallenge(FALLBACK_SEEDS[index], "generated", `generated-seed-${index}`);
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
    return cached;
  }

  const persisted = await getDailyChallengeByDateKey(dateKey);
  if (persisted) {
    const generatedClicks = buildDailyChallengeEntry(dateKey, "clicks", `${persisted.startTitle}::${persisted.targetTitle}`);
    const dailySet: DailyChallengeSet = {
      dateKey,
      challenges: [
        {
          mode: "time",
          objective: "Fastest completion time wins.",
          challenge: { ...persisted, id: `daily-time-${dateKey}`, label: "Daily Speed Challenge", source: "daily" },
        },
        generatedClicks,
      ],
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

  const dailySet: DailyChallengeSet = { dateKey, challenges: entries };
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
        objective: "Fastest completion time wins.",
        challenge: {
          ...timeChallenge,
          id: `daily-time-${dateKey}`,
          label: "Daily Speed Challenge",
          source: "daily",
        },
      },
      clicksEntry,
    ],
  };
  await cache.set(REDIS_KEYS.daily(dateKey), dailySet, 24 * 60 * 60);
}
