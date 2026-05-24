import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  guestUsernameSuffix,
  isGuestAccount,
  isGuestUsername,
  isValidGuestClientId,
} from "./guest-user";

describe("guest user helpers", () => {
  it("accepts uuid v4 guest client ids", () => {
    assert.equal(isValidGuestClientId("550e8400-e29b-41d4-a716-446655440000"), true);
  });

  it("rejects reserved and malformed ids", () => {
    assert.equal(isValidGuestClientId("seed-user-guest"), false);
    assert.equal(isValidGuestClientId("not-a-uuid"), false);
    assert.equal(isValidGuestClientId(""), false);
  });

  it("detects guest accounts by username and email", () => {
    assert.equal(isGuestUsername("guest_runner"), true);
    assert.equal(isGuestUsername("guest_a7164466"), true);
    assert.equal(isGuestUsername("wikiracer42"), false);
    assert.equal(
      isGuestAccount({ email: null, username: "guest_a7164466" }),
      true,
    );
    assert.equal(
      isGuestAccount({ email: "a@b.com", username: "guest_a7164466" }),
      false,
    );
  });

  it("builds a stable username suffix from the client id", () => {
    assert.equal(guestUsernameSuffix("550e8400-e29b-41d4-a716-446655440000"), "55440000");
  });
});
