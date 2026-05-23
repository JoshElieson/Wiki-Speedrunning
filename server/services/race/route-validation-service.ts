import { ApiError } from "@/server/errors/api-error";
import type { RunStepInput } from "@/types/domain";
import { getWikiModeId, type WikiModeId } from "@/lib/wiki-modes";
import { normalizeWikiTitle, raceTargetTitleMatches, toWikiTitleKey } from "@/server/services/wiki/title-normalization";
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
  const normalizedCurrentTitle = normalizeWikiTitle(currentTitle);
  const normalizedNextTitle = normalizeWikiTitle(nextTitle);
  const normalizedTargetTitle = targetTitle ? normalizeWikiTitle(targetTitle) : undefined;

  if (!normalizedCurrentTitle || !normalizedNextTitle) {
    throw new ApiError(400, "INVALID_MOVE", "Current and next article titles are required");
  }

  const normalizedWikiId = getWikiModeId(wikiId);
  const isValid = await isValidOutgoingLinkForWiki(normalizedWikiId, normalizedCurrentTitle, normalizedNextTitle);
  const completed = Boolean(targetTitle && isValid && raceTargetTitleMatches(nextTitle, targetTitle));

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
  const startTitle = normalizeWikiTitle(input.challengeStartTitle);
  const startTitleKey = toWikiTitleKey(startTitle);
  const normalizedRoute = input.route.map((title) => normalizeWikiTitle(title));
  const normalizedRouteKeys = normalizedRoute.map((title) => toWikiTitleKey(title));

  if (normalizedRoute.length < 2) {
    throw new ApiError(400, "INVALID_ROUTE", "Route must contain at least two pages");
  }

  if (normalizedRouteKeys[0] !== startTitleKey) {
    throw new ApiError(400, "INVALID_ROUTE_START", "Route does not start at challenge start article");
  }

  const routeEndTitle = input.route[input.route.length - 1] ?? "";
  if (!raceTargetTitleMatches(routeEndTitle, input.challengeTargetTitle)) {
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

    if (toWikiTitleKey(fromTitle) !== toWikiTitleKey(expectedFrom) || toWikiTitleKey(toTitle) !== toWikiTitleKey(expectedTo)) {
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
