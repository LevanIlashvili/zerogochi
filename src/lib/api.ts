"use client";

import { tgInitData } from "./cloudStorage";
import { devUserId, isDevMode } from "./devMode";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8787";

let devAddress: string | null = null;
export function setDevAddress(addr: string | null) {
  devAddress = addr;
}

export class BackendError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");

  const initData = tgInitData();
  if (initData) {
    headers.set("x-tg-init-data", initData);
  } else if (isDevMode() && devAddress) {
    // Backend will mint a synthetic user from these headers iff its own
    // NODE_ENV is non-production.
    headers.set("x-dev-mode", "1");
    headers.set("x-dev-user-id", String(devUserId(devAddress)));
  }

  const res = await fetch(BACKEND_URL + path, { ...init, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new BackendError(res.status, `${res.status} ${path}: ${body}`);
  }
  return (await res.json()) as T;
}

export interface RelayResult {
  txHash: string;
  blockNumber?: number;
  gasUsed?: string;
}

export interface PetSummary {
  tokenId: number;
  exists: boolean;
  hunger?: number;
  mood?: number;
  energy?: number;
  dead?: boolean;
  /** Unix seconds — null if Born event not yet indexed */
  bornAt?: number | null;
  /** Original minter — null if Born event not yet indexed */
  minter?: string | null;
  /** True if the current owner is not the original minter */
  inherited?: boolean;
}

export const api = {
  health: () => request<{ ok: boolean; chainId: number }>("/api/health"),

  me: () => request<{ tgUserId: number; username?: string }>("/api/me"),

  myPet: (address: string) =>
    request<PetSummary>(`/api/pet/mine?address=${address}`),

  relay: (request_: object) =>
    request<RelayResult>("/api/relay", {
      method: "POST",
      body: JSON.stringify({ request: request_ }),
    }),

  uploadBlob: (ciphertextB64: string) =>
    request<{ rootHash: string; txHash: string }>("/api/storage/upload", {
      method: "POST",
      body: JSON.stringify({ ciphertextB64 }),
    }),

  register: (body: { address: string; tokenId?: number }) =>
    request<{ ok: boolean }>("/api/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  talk: (body: {
    tokenId: number;
    userMessage: string;
    recent?: Array<{ role: "user" | "pet"; content: string }>;
    personality: { voice: string; hungerDecayRate: number; moodDecayRate: number; energyDecayRate: number };
    inherited?: boolean;
  }) =>
    request<{ reply: string; verified: boolean; elapsedMs: number }>("/api/talk", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  interrogate: (body: {
    tokenId: number;
    personality: { voice: string; hungerDecayRate: number; moodDecayRate: number; energyDecayRate: number };
  }) =>
    request<{ reply: string; verified: boolean; elapsedMs: number }>("/api/talk/interrogate", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  thought: (body: {
    tokenId: number;
    personality: { voice: string; hungerDecayRate: number; moodDecayRate: number; energyDecayRate: number };
  }) =>
    request<{ reply: string; verified: boolean; elapsedMs: number }>("/api/talk/thought", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  event: (body: {
    tokenId: number;
    personality: { voice: string; hungerDecayRate: number; moodDecayRate: number; energyDecayRate: number };
  }) =>
    request<{ reply: string; verified: boolean; elapsedMs: number }>("/api/talk/event", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  dream: (body: {
    tokenId: number;
    personality: { voice: string; hungerDecayRate: number; moodDecayRate: number; energyDecayRate: number };
  }) =>
    request<{ reply: string; verified: boolean; elapsedMs: number }>("/api/talk/dream", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
