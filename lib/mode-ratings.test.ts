import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_ELO } from "@/lib/elo";
import { LEADERBOARD_SCOPES } from "@/lib/leaderboard-scopes";
import {
  buildEloByMode,
  createDefaultEloByMode,
  eloScopeFromWikiModeId,
  wikiModeIdFromEloScope,
} from "@/lib/mode-ratings";

describe("mode ratings", () => {
  it("defaults every scope to the standard starting ELO", () => {
    const defaults = createDefaultEloByMode();
    for (const scope of LEADERBOARD_SCOPES) {
      assert.equal(defaults[scope], DEFAULT_ELO);
    }
  });

  it("keeps per-scope ratings isolated when building eloByMode", () => {
    const eloByMode = buildEloByMode([
      { scope: "wikipedia", rating: 1400 },
      { scope: "minecraft", rating: 1000 },
      { scope: "league", rating: 1325 },
    ]);

    assert.equal(eloByMode.wikipedia, 1400);
    assert.equal(eloByMode.minecraft, 1000);
    assert.equal(eloByMode.league, 1325);
    assert.equal(eloByMode.pokemon, DEFAULT_ELO);
    assert.equal(eloByMode.marvel, DEFAULT_ELO);
  });

  it("maps wiki mode ids to leaderboard scopes", () => {
    assert.equal(eloScopeFromWikiModeId("minecraft"), "minecraft");
    assert.equal(wikiModeIdFromEloScope("star-wars"), "star-wars");
  });
});
