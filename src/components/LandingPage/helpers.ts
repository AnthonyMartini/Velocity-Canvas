import { REDIRECT_ORIGIN_KEY, REDIRECT_PENDING_KEY } from "./constants";

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function clearRedirectSessionState() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(REDIRECT_PENDING_KEY);
  window.sessionStorage.removeItem(REDIRECT_ORIGIN_KEY);
}

export function markRedirectSignInPending() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(REDIRECT_PENDING_KEY, "1");
  window.sessionStorage.setItem(REDIRECT_ORIGIN_KEY, window.location.origin);
}
