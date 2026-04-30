"use client";

import { cloudStorage } from "./cloudStorage";
import { buildPersonality, type Personality } from "./personality";

const KEY = "zerogochi:personality";

export async function cachePersonality(p: Personality): Promise<void> {
  await cloudStorage.set(KEY, JSON.stringify(p));
}

export async function loadCachedPersonality(): Promise<Personality | null> {
  const raw = await cloudStorage.get(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Personality;
    // Migrate older blobs that predate the `name` field by re-deriving
    // from the still-canonical vector. Re-cache so we don't keep migrating.
    if (!parsed.name && parsed.vector) {
      const fresh = buildPersonality(parsed.vector);
      const merged: Personality = { ...parsed, name: fresh.name };
      await cachePersonality(merged);
      return merged;
    }
    return parsed;
  } catch {
    return null;
  }
}
