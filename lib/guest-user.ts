/** Client-generated ids stored in localStorage; must be UUID v4. */
export const GUEST_CLIENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const GUEST_USERNAME_PREFIX = "guest_";

export const LEGACY_SHARED_GUEST_USERNAME = "guest_runner";

const RESERVED_GUEST_IDS = new Set(["seed-user-guest"]);

export function isValidGuestClientId(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || RESERVED_GUEST_IDS.has(trimmed)) {
    return false;
  }

  return GUEST_CLIENT_ID_PATTERN.test(trimmed);
}

export function isGuestUsername(username: string): boolean {
  return username === LEGACY_SHARED_GUEST_USERNAME || username.startsWith(GUEST_USERNAME_PREFIX);
}

export function isGuestAccount(user: { email: string | null; username: string }): boolean {
  return user.email === null && isGuestUsername(user.username);
}

export function guestUsernameSuffix(clientGuestId: string): string {
  return clientGuestId.replace(/-/g, "").slice(-8).toLowerCase();
}
