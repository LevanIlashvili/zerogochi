"use client";

import { api } from "./api";
import { mintPet } from "./mint";
import { buildPersonality, personalityHash, type Personality } from "./personality";
import { cachePersonality } from "./personalityCache";
import { seal } from "./seal";
import { signerFromWallet, type ZgWallet } from "./wallet";

export interface CreatePetResult {
  txHash: string;
  rootHash: string;
  personality: Personality;
}

/**
 * Full pet-creation pipeline:
 *   1. Generate personality client-side
 *   2. AES-GCM seal it with a wallet-derived key
 *   3. Upload encrypted blob to 0G Storage via backend
 *   4. Mint iNFT, committing the dataHash on-chain
 *
 * Returns the tx hash and rootHash. The user's tokenId is discoverable
 * afterwards via api.myPet(wallet.address).
 */
export async function createPet(wallet: ZgWallet): Promise<CreatePetResult> {
  const personality = buildPersonality();
  const signer = signerFromWallet(wallet);
  const sealed = await seal(JSON.stringify(personality), signer);

  // Sanity: the on-chain hash must match what we put in storage.
  if (sealed.dataHash.toLowerCase() !== sealed.dataHash.toLowerCase()) {
    throw new Error("seal hash mismatch");
  }

  const upload = await api.uploadBlob(sealed.ciphertextB64);

  const personalityUri = `0g://${upload.rootHash}`;

  const mint = await mintPet({
    wallet,
    personalityHash: sealed.dataHash,
    personalityUri,
    visualSeed: personality.visualSeed,
    hungerDecayRate: personality.hungerDecayRate,
    moodDecayRate: personality.moodDecayRate,
    energyDecayRate: personality.energyDecayRate,
  });

  // Cache plaintext locally so subsequent talks don't have to re-derive
  // (the wallet key is already client-side; same trust boundary).
  await cachePersonality(personality);

  return {
    txHash: mint.txHash,
    rootHash: upload.rootHash,
    personality,
  };
}

// re-export for convenience
export { personalityHash };
