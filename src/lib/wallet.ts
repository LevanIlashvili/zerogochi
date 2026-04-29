"use client";

import { HDNodeWallet, Mnemonic, Wallet } from "ethers";
import { cloudStorage } from "./cloudStorage";

const KEY_PK = "zerogochi:pk";
const KEY_MNEMONIC = "zerogochi:mnemonic";
const KEY_ADDRESS = "zerogochi:address";

export interface ZgWallet {
  privateKey: string;
  address: string;
  mnemonic: string | null;
}

/**
 * Load existing wallet from CloudStorage, or generate a fresh one and persist
 * it. Backed by Telegram CloudStorage in production, localStorage in dev.
 *
 * Generation uses ethers.HDNodeWallet (BIP-39 / BIP-44) so the user can
 * recover via mnemonic later (settings/export flow).
 */
export async function loadOrCreateWallet(): Promise<ZgWallet> {
  const existing = await cloudStorage.get(KEY_PK);
  const existingAddress = await cloudStorage.get(KEY_ADDRESS);
  if (existing && existingAddress) {
    const mnemonic = await cloudStorage.get(KEY_MNEMONIC);
    return { privateKey: existing, address: existingAddress, mnemonic };
  }

  const hd = HDNodeWallet.createRandom();
  const mnemonic = hd.mnemonic?.phrase ?? null;
  const wallet: ZgWallet = {
    privateKey: hd.privateKey,
    address: hd.address,
    mnemonic,
  };

  // Persist sequentially — CloudStorage doesn't allow parallel writes reliably.
  await cloudStorage.set(KEY_PK, wallet.privateKey);
  await cloudStorage.set(KEY_ADDRESS, wallet.address);
  if (mnemonic) await cloudStorage.set(KEY_MNEMONIC, mnemonic);

  return wallet;
}

/**
 * Construct an ethers signer for the stored wallet. Use this only for
 * signing — never broadcast directly; broadcasting goes through the
 * backend relayer to keep gas sponsorship clean.
 */
export function signerFromWallet(w: ZgWallet): Wallet {
  return new Wallet(w.privateKey);
}

export async function importFromMnemonic(phrase: string): Promise<ZgWallet> {
  const trimmed = phrase.trim().toLowerCase().split(/\s+/).join(" ");
  const m = Mnemonic.fromPhrase(trimmed);
  const hd = HDNodeWallet.fromMnemonic(m);
  const wallet: ZgWallet = {
    privateKey: hd.privateKey,
    address: hd.address,
    mnemonic: trimmed,
  };
  await cloudStorage.set(KEY_PK, wallet.privateKey);
  await cloudStorage.set(KEY_ADDRESS, wallet.address);
  await cloudStorage.set(KEY_MNEMONIC, trimmed);
  return wallet;
}

export async function clearWallet(): Promise<void> {
  await cloudStorage.remove(KEY_PK);
  await cloudStorage.remove(KEY_ADDRESS);
  await cloudStorage.remove(KEY_MNEMONIC);
}
