"use client";

import { keccak256, toUtf8Bytes, type Wallet } from "ethers";

const UNLOCK_MESSAGE = "Zerogochi personality v1";

/**
 * Derive a deterministic 32-byte AES key from the wallet by signing a fixed
 * message. ethers' `signMessage` uses personal_sign, which is the same on
 * every call for the same key+message — so we get a key the user can rederive
 * on subsequent visits without storing any secret.
 *
 * The key never leaves the client unless the user explicitly opts in to
 * sharing it with a TEE provider for inference.
 */
async function deriveKey(signer: Wallet): Promise<CryptoKey> {
  const sig = await signer.signMessage(UNLOCK_MESSAGE);
  // keccak256 of the signature gives us a 32-byte uniform value for AES-GCM.
  const raw = keccak256(toUtf8Bytes(sig));
  const bytes = hexToBytes(raw);
  return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(h.substr(i * 2, 2), 16);
  }
  return out;
}

function bytesToHex(b: Uint8Array): string {
  return "0x" + Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export interface SealedBlob {
  /** Versioned wrapper, base64 of [12-byte iv | ciphertext+tag] */
  ciphertextB64: string;
  /** keccak256 of the raw bytes (iv|ciphertext) — committed on-chain */
  dataHash: string;
}

export async function seal(plaintext: string, signer: Wallet): Promise<SealedBlob> {
  const key = await deriveKey(signer);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext)),
  );
  const wrapped = new Uint8Array(iv.length + ct.length);
  wrapped.set(iv, 0);
  wrapped.set(ct, iv.length);
  return {
    ciphertextB64: bytesToBase64(wrapped),
    dataHash: keccak256(wrapped),
  };
}

export async function unseal(ciphertextB64: string, signer: Wallet): Promise<string> {
  const key = await deriveKey(signer);
  const wrapped = base64ToBytes(ciphertextB64);
  const iv = wrapped.slice(0, 12);
  const ct = wrapped.slice(12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

function bytesToBase64(b: Uint8Array): string {
  if (typeof Buffer !== "undefined") return Buffer.from(b).toString("base64");
  let s = "";
  for (const c of b) s += String.fromCharCode(c);
  return btoa(s);
}

function base64ToBytes(s: string): Uint8Array {
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(s, "base64"));
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const __test = { bytesToHex };
