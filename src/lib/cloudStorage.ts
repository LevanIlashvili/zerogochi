"use client";

/**
 * Thin promise wrapper over Telegram WebApp.CloudStorage.
 * Falls back to localStorage for development outside Telegram.
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

export const cloudStorage = {
  async get(key: string): Promise<string | null> {
    const cs = tg();
    if (cs) {
      return new Promise((resolve, reject) => {
        cs.getItem(key, (err, value) => {
          if (err) reject(err);
          else resolve(value ?? null);
        });
      });
    }
    if (typeof window !== "undefined") {
      return window.localStorage.getItem(LS_PREFIX + key);
    }
    return null;
  },

  async set(key: string, value: string): Promise<void> {
    const cs = tg();
    if (cs) {
      return new Promise((resolve, reject) => {
        cs.setItem(key, value, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LS_PREFIX + key, value);
    }
  },

  async remove(key: string): Promise<void> {
    const cs = tg();
    if (cs) {
      return new Promise((resolve, reject) => {
        cs.removeItem(key, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LS_PREFIX + key);
    }
  },
};

export function tgInitData(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.Telegram?.WebApp?.initData;
}
