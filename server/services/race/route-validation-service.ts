import { ApiError } from "@/server/errors/api-error";
import type { RunStepInput } from "@/types/domain";
import { getWikiModeId, type WikiModeId } from "@/lib/wiki-modes";
import {
  normalizeTitleForWiki,
  raceTargetMatchesForWiki,
  toTitleKeyForWiki,
} from "@/server/services/wiki/title-normalization";
import { isValidOutgoingLinkForWiki } from "@/server/services/wiki/wiki-provider";

export interface RouteValidationInput {
  challengeStartTitle: string;
  challengeTargetTitle: string;
  route: string[];
  steps: RunStepInput[];
  wikiId?: WikiModeId;
}

export interface RouteValidationResult {
  isValid: boolean;
  completed: boolean;
  normalizedRoute: string[];
}

export async function validateMove(currentTitle: string, nextTitle: string, targetTitle?: string, wikiId?: WikiModeId) {
  const normalizedWikiId = getWikiModeId(wikiId);
  const normalizedCurrentTitle = normalizeTitleForWiki(currentTitle, normalizedWikiId);
  const normalizedNextTitle = normalizeTitleForWiki(nextTitle, normalizedWikiId);
  const normalizedTargetTitle = targetTitle ? normalizeTitleForWiki(targetTitle, normalizedWikiId) : undefined;

  if (!normalizedCurrentTitle || !normalizedNextTitle) {
    throw new ApiError(400, "INVALID_MOVE", "Current and next article titles are required");
  }

  const isValid = await isValidOutgoingLinkForWiki(normalizedWikiId, normalizedCurrentTitle, normalizedNextTitle);
  const completed = Boolean(targetTitle && isValid && raceTargetMatchesForWiki(nextTitle, targetTitle, normalizedWikiId));

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
  const wikiId = getWikiModeId(input.wikiId);
  const startTitle = normalizeTitleForWiki(input.challengeStartTitle, wikiId);
  const startTitleKey = toTitleKeyForWiki(startTitle, wikiId);
  const normalizedRoute = input.route.map((title) => normalizeTitleForWiki(title, wikiId));
  const normalizedRouteKeys = normalizedRoute.map((title) => toTitleKeyForWiki(title, wikiId));

  if (normalizedRoute.length < 2) {
    throw new ApiError(400, "INVALID_ROUTE", "Route must contain at least two pages");
  }

  if (normalizedRouteKeys[0] !== startTitleKey) {
    throw new ApiError(400, "INVALID_ROUTE_START", "Route does not start at challenge start article");
  }

  const routeEndTitle = input.route[input.route.length - 1] ?? "";
  if (!raceTargetMatchesForWiki(routeEndTitle, input.challengeTargetTitle, wikiId)) {
    throw new ApiError(400, "INVALID_ROUTE_END", "Route does not end at challenge target article");
  }

  if (input.steps.length !== normalizedRoute.length - 1) {
    throw new ApiError(400, "INVALID_STEPS", "Run step count must match route transitions");
  }

  for (let index = 0; index < input.steps.length; index += 1) {
    const step = input.steps[index];
    const expectedFrom = normalizedRoute[index];
    const expectedTo = normalizedRoute[index + 1];
    const fromTitle = normalizeTitleForWiki(step.fromTitle, wikiId);
    const toTitle = normalizeTitleForWiki(step.toTitle, wikiId);

    if (
      toTitleKeyForWiki(fromTitle, wikiId) !== toTitleKeyForWiki(expectedFrom, wikiId) ||
      toTitleKeyForWiki(toTitle, wikiId) !== toTitleKeyForWiki(expectedTo, wikiId)
    ) {
      throw new ApiError(400, "ROUTE_STEP_MISMATCH", "Submitted steps do not match submitted route");
    }

    const validTransition = await isValidOutgoingLinkForWiki(wikiId, fromTitle, toTitle);
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
