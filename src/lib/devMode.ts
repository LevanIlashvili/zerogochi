"use client";

/**
 * Dev-only browser testing affordance. Off in production builds, off
 * by default even in development — the user must opt in with `?dev=1`.
 *
 * When active, the API client sends a synthetic `x-dev-mode: 1` header
 * the backend's TgInitDataGuard recognizes, but only when its own
 * NODE_ENV is non-production. Two locks on the same door.
 */
export function isDevMode(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NODE_ENV === "production") return false;
  // URL flag persists into a session storage key once seen, so subsequent
  // navigations don't lose it.
  const url = new URL(window.location.href);
  if (url.searchParams.get("dev") === "1") {
    window.sessionStorage.setItem("zgo:dev", "1");
    return true;
  }
  return window.sessionStorage.getItem("zgo:dev") === "1";
}

/// Stable synthetic TG user id used in dev mode. Derived from a hash of
/// the wallet address so two browser profiles get different ids.
export function devUserId(walletAddress: string): number {
  let h = 0;
  for (let i = 0; i < walletAddress.length; i++) {
    h = (h * 31 + walletAddress.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || 1;
}
