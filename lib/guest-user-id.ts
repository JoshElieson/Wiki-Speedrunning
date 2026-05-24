import { isValidGuestClientId } from "@/lib/guest-user";

const STORAGE_KEY = "wikirush_guest_user_id";

function createGuestClientId(): string {
  return crypto.randomUUID();
}

/** Stable per-browser guest profile id (localStorage). */
export function getOrCreateGuestUserId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing && isValidGuestClientId(existing)) {
    return existing;
  }

  const created = createGuestClientId();
  window.localStorage.setItem(STORAGE_KEY, created);
  return created;
}
