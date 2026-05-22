import { ApiError } from "@/server/errors/api-error";
import type { RunStepInput } from "@/types/domain";
import { normalizeWikiTitle } from "@/server/services/wiki/title-normalization";
import { isValidOutgoingLink } from "@/server/services/wiki/wikipedia-service";

export interface RouteValidationInput {
  challengeStartTitle: string;
  challengeTargetTitle: string;
  route: string[];
  steps: RunStepInput[];
}

export interface RouteValidationResult {
  isValid: boolean;
  completed: boolean;
  normalizedRoute: string[];
}

export async function validateMove(currentTitle: string, nextTitle: string, targetTitle?: string) {
  const normalizedCurrentTitle = normalizeWikiTitle(currentTitle);
  const normalizedNextTitle = normalizeWikiTitle(nextTitle);
  const normalizedTargetTitle = targetTitle ? normalizeWikiTitle(targetTitle) : undefined;

  if (!normalizedCurrentTitle || !normalizedNextTitle) {
    throw new ApiError(400, "INVALID_MOVE", "Current and next article titles are required");
  }

  const isValid = await isValidOutgoingLink(normalizedCurrentTitle, normalizedNextTitle);
  const completed = Boolean(normalizedTargetTitle && normalizedTargetTitle === normalizedNextTitle);

  return {
    isValid,
    completed: isValid && completed,
    normalizedCurrentTitle,
    normalizedNextTitle,
    normalizedTargetTitle,
    reason: isValid ? undefined : "Selected article is not a valid outgoing link from current article",
  };
}

export async function validateCompletedRoute(input: RouteValidationInput): Promise<RouteValidationResult> {
  const startTitle = normalizeWikiTitle(input.challengeStartTitle);
  const targetTitle = normalizeWikiTitle(input.challengeTargetTitle);
  const normalizedRoute = input.route.map((title) => normalizeWikiTitle(title));

  if (normalizedRoute.length < 2) {
    throw new ApiError(400, "INVALID_ROUTE", "Route must contain at least two pages");
  }

  if (normalizedRoute[0] !== startTitle) {
    throw new ApiError(400, "INVALID_ROUTE_START", "Route does not start at challenge start article");
  }

  if (normalizedRoute[normalizedRoute.length - 1] !== targetTitle) {
    throw new ApiError(400, "INVALID_ROUTE_END", "Route does not end at challenge target article");
  }

  if (input.steps.length !== normalizedRoute.length - 1) {
    throw new ApiError(400, "INVALID_STEPS", "Run step count must match route transitions");
  }

  for (let index = 0; index < input.steps.length; index += 1) {
    const step = input.steps[index];
    const expectedFrom = normalizedRoute[index];
    const expectedTo = normalizedRoute[index + 1];
    const fromTitle = normalizeWikiTitle(step.fromTitle);
    const toTitle = normalizeWikiTitle(step.toTitle);

    if (fromTitle !== expectedFrom || toTitle !== expectedTo) {
      throw new ApiError(400, "ROUTE_STEP_MISMATCH", "Submitted steps do not match submitted route");
    }

    const validTransition = await isValidOutgoingLink(fromTitle, toTitle);
    if (!validTransition) {
      throw new ApiError(400, "INVALID_ROUTE_TRANSITION", `Invalid transition: ${step.fromTitle} -> ${step.toTitle}`);
    }
  }

  return {
    isValid: true,
    completed: true,
    normalizedRoute,
  };
}
