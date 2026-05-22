import { z } from "zod";

export const wikiArticleQuerySchema = z.object({
  title: z.string().trim().min(1, "Article title is required"),
});

export const createChallengeBodySchema = z.object({
  label: z.string().trim().min(1),
  description: z.string().trim().optional(),
  startTitle: z.string().trim().min(1),
  targetTitle: z.string().trim().min(1),
  difficultyScore: z.number().min(1).max(100).optional(),
  shortestPathHint: z.number().int().min(1).max(30).optional(),
  seed: z.string().trim().optional(),
  isActive: z.boolean().optional(),
});

export const validateMoveBodySchema = z.object({
  challengeId: z.string().trim().min(1),
  currentTitle: z.string().trim().min(1),
  nextTitle: z.string().trim().min(1),
  targetTitle: z.string().trim().optional(),
  path: z.array(z.string().trim().min(1)).optional(),
});

const runStepSchema = z.object({
  fromTitle: z.string().trim().min(1),
  toTitle: z.string().trim().min(1),
  clickedAtOffsetMs: z.number().int().min(0),
});

export const submitRunBodySchema = z.object({
  challengeId: z.string().trim().min(1),
  userId: z.string().trim().optional(),
  durationMs: z.number().int().positive(),
  clickCount: z.number().int().min(0),
  route: z.array(z.string().trim().min(1)).min(2),
  steps: z.array(runStepSchema).min(1),
});

export const leaderboardQuerySchema = z.object({
  scope: z.string().trim().default("global"),
  limit: z.coerce.number().int().positive().max(500).default(100),
});

export const challengeByIdQuerySchema = z.object({
  id: z.string().trim().min(1),
});
