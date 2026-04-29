"use client";

import { tgInitData } from "./cloudStorage";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8787";

export class BackendError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  const initData = tgInitData();
  if (initData) headers.set("x-tg-init-data", initData);

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
};
