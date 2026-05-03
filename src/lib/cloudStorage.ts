"use client";

/**
 * Thin promise wrapper over Telegram WebApp.CloudStorage with a timeout
 * fallback. Telegram's CloudStorage callbacks are slow and occasionally
 * silent (the SDK never invokes them), which would deadlock the UI.
 * If TG doesn't respond inside CS_TIMEOUT_MS, we fall back to the local
 * mirror so the app keeps moving.
 */

interface TgCloudStorage {
  setItem: (key: string, value: string, cb?: (err: Error | null, ok?: boolean) => void) => void;
  getItem: (key: string, cb: (err: Error | null, value?: string | null) => void) => void;
  removeItem: (key: string, cb?: (err: Error | null, ok?: boolean) => void) => void;
  getKeys: (cb: (err: Error | null, keys?: string[]) => void) => void;
}

interface TgWebApp {
  CloudStorage?: TgCloudStorage;
  initData?: string;
  initDataUnsafe?: { user?: { id: number; username?: string } };
  ready?: () => void;
  expand?: () => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

function tg(): TgCloudStorage | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp?.CloudStorage ?? null;
}

const LS_PREFIX = "zerogochi:dev:";
const CS_TIMEOUT_MS = 2500;

function lsGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LS_PREFIX + key);
}

function lsSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_PREFIX + key, value);
}

function lsRemove(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LS_PREFIX + key);
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      window.setTimeout(() => reject(new Error("cloudstorage timeout")), ms),
    ),
  ]);
}

export const cloudStorage = {
  async get(key: string): Promise<string | null> {
    const cs = tg();
    if (cs) {
      try {
        const value = await withTimeout(
          new Promise<string | null>((resolve, reject) => {
            cs.getItem(key, (err, v) => {
              if (err) reject(err);
              else resolve(v ?? null);
            });
          }),
          CS_TIMEOUT_MS,
        );
        // Mirror to localStorage so subsequent loads are instant + survive
        // CloudStorage flakiness.
        if (value !== null) lsSet(key, value);
        return value;
      } catch {
        // CloudStorage hung or errored — fall back to local mirror.
        return lsGet(key);
      }
    }
    return lsGet(key);
  },

  async set(key: string, value: string): Promise<void> {
    // Always write the local mirror first so we never lose data if TG fails.
    lsSet(key, value);
    const cs = tg();
    if (cs) {
      try {
        await withTimeout(
          new Promise<void>((resolve, reject) => {
            cs.setItem(key, value, (err) => {
              if (err) reject(err);
              else resolve();
            });
          }),
          CS_TIMEOUT_MS,
        );
      } catch {
        // tolerate — local mirror has it
      }
    }
  },

  async remove(key: string): Promise<void> {
    lsRemove(key);
    const cs = tg();
    if (cs) {
      try {
        await withTimeout(
          new Promise<void>((resolve, reject) => {
            cs.removeItem(key, (err) => {
              if (err) reject(err);
              else resolve();
            });
          }),
          CS_TIMEOUT_MS,
        );
      } catch {
        // tolerate
      }
    }
  },
};

export function tgInitData(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.Telegram?.WebApp?.initData;
}
