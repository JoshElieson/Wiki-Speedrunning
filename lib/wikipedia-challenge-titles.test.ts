import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isEligibleWikipediaChallengeTitle,
  isLikelyProperNounTitle,
} from "./wikipedia-challenge-titles";

describe("wikipedia challenge title eligibility", () => {
  it("accepts multi-word sentence-case general topics", () => {
    assert.equal(isEligibleWikipediaChallengeTitle("Machine learning"), true);
    assert.equal(isEligibleWikipediaChallengeTitle("Graph theory"), true);
    assert.equal(isEligibleWikipediaChallengeTitle("Open source software"), true);
    assert.equal(isEligibleWikipediaChallengeTitle("History of mathematics"), true);
    assert.equal(isEligibleWikipediaChallengeTitle("Climate change"), true);
  });

  it("rejects title-case and embedded proper names", () => {
    assert.equal(isEligibleWikipediaChallengeTitle("Alan Turing"), false);
    assert.equal(isEligibleWikipediaChallengeTitle("United States"), false);
    assert.equal(isEligibleWikipediaChallengeTitle("World War II"), false);
    assert.equal(isEligibleWikipediaChallengeTitle("World Wide Web"), false);
    assert.equal(isEligibleWikipediaChallengeTitle("New York City"), false);
    assert.equal(isEligibleWikipediaChallengeTitle("History of Israel"), false);
  });

  it("rejects single-word titles and camelCase names", () => {
    assert.equal(isEligibleWikipediaChallengeTitle("Mars"), false);
    assert.equal(isEligibleWikipediaChallengeTitle("TypeScript"), false);
    assert.equal(isEligibleWikipediaChallengeTitle("Physics"), false);
    assert.equal(isLikelyProperNounTitle("TypeScript"), true);
  });

  it("rejects year-only titles", () => {
    assert.equal(isLikelyProperNounTitle("1999"), true);
    assert.equal(isLikelyProperNounTitle("21st century"), true);
  });
});
