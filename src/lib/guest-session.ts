const GUEST_SESSION_KEY = "lord-of-war-guest-session-id";

export function getGuestSessionId() {
  if (typeof window === "undefined") {
    return "";
  }

  const existing = window.localStorage.getItem(GUEST_SESSION_KEY);

  if (existing) {
    return existing;
  }

  const created = crypto.randomUUID();
  window.localStorage.setItem(GUEST_SESSION_KEY, created);

  return created;
}