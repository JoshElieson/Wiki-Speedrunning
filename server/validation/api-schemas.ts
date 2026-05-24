import { isValidGuestClientId } from "@/lib/guest-user";
import { z } from "zod";
import { DEFAULT_LEADERBOARD_SCOPE, LEADERBOARD_SCOPES } from "@/lib/leaderboard-scopes";
import { SUPPORTED_WIKI_IDS, WIKI_MODE_IDS } from "@/lib/wiki-modes";

export const wikiArticleQuerySchema = z.object({
  title: z.string().trim().min(1, "Article title is required"),
  wikiId: z.enum(SUPPORTED_WIKI_IDS).nullish(),
  mode: z.enum(WIKI_MODE_IDS).nullish(),
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
  wikiId: z.enum(WIKI_MODE_IDS).optional(),
});

const legacyRunStepSchema = z.object({
  fromTitle: z.string().trim().min(1),
  toTitle: z.string().trim().min(1),
  clickedAtOffsetMs: z.number().int().min(0),
});

const canonicalRunStepSchema = z.object({
  stepIndex: z.number().int().min(0),
  articleTitle: z.string().trim().min(1),
  normalizedArticleTitle: z.string().trim().min(1).optional(),
  elapsedMs: z.number().int().min(0),
  articleUrl: z.string().trim().url().optional(),
  visitedAtIso: z.string().datetime().optional(),
  kind: z.enum(["start", "intermediate", "target"]).optional(),
});

export const saveRunBodySchema = z
  .object({
    challengeId: z.string().trim().min(1),
    wikiMode: z.enum(WIKI_MODE_IDS).optional(),
    userId: z.string().trim().min(1).optional().nullable(),
    completed: z.boolean().optional(),
    finalElapsedMs: z.number().int().min(0).optional(),
    durationMs: z.number().int().min(0).optional(),
    clickCount: z.number().int().min(0),
    route: z.array(z.string().trim().min(1)).min(1),
    steps: z.array(z.union([canonicalRunStepSchema, legacyRunStepSchema])),
    challengeSnapshot: z
      .object({
        label: z.string().trim().min(1),
        startTitle: z.string().trim().min(1),
        targetTitle: z.string().trim().min(1),
        difficultyScore: z.number().min(1).max(100),
        wikiId: z.enum(WIKI_MODE_IDS).optional(),
      })
      .optional(),
    difficultyScore: z.number().finite().optional(),
    startedAt: z.string().datetime().optional(),
    completedAt: z.string().datetime().optional(),
  })
  .superRefine((value, ctx) => {
    const isCompleted = value.completed !== false;
    const elapsed = value.finalElapsedMs ?? value.durationMs;

    if (elapsed === undefined || elapsed < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["finalElapsedMs"],
        message: "finalElapsedMs (or durationMs for legacy clients) is required",
      });
    } else if (isCompleted && elapsed <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["finalElapsedMs"],
        message: "finalElapsedMs must be positive for completed runs",
      });
    }

    if (isCompleted && value.route.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["route"],
        message: "Completed runs must include at least a start and target article",
      });
    }

    const expectedClicks = value.route.length - 1;
    if (value.clickCount !== expectedClicks) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["clickCount"],
        message: `clickCount must match route transitions (${expectedClicks})`,
      });
    }

    if (value.userId && !isValidGuestClientId(value.userId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["userId"],
        message: "userId must be a valid guest profile id",
      });
    }
  });

export const submitRunBodySchema = saveRunBodySchema;

export const runHistoryFiltersSchema = z.object({
  userId: z.string().trim().min(1).optional(),
  challengeId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const leaderboardQuerySchema = z.object({
  scope: z.enum(LEADERBOARD_SCOPES).default(DEFAULT_LEADERBOARD_SCOPE),
  limit: z.coerce.number().int().positive().max(500).default(100),
});

export const challengeByIdQuerySchema = z.object({
  id: z.string().trim().min(1),
});

export const updateProfileBodySchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required").max(48, "Display name is too long"),
  avatarUrl: z
    .union([z.string().trim().url("Avatar must be a valid image URL"), z.literal(""), z.null()])
    .optional(),
});
