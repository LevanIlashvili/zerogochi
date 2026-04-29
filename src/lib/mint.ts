"use client";

import { JsonRpcProvider } from "ethers";
import { api } from "./api";
import { buildSignedForwardRequest } from "./forwarder";
import { signerFromWallet, type ZgWallet } from "./wallet";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://evmrpc.0g.ai";
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "16661");
const FORWARDER = process.env.NEXT_PUBLIC_FORWARDER ?? "";
const ZEROGOCHI = process.env.NEXT_PUBLIC_ZEROGOCHI ?? "";

export interface MintArgs {
  wallet: ZgWallet;
  personalityHash: string; // 0x-prefixed bytes32
  personalityUri: string; // 0g://<hex> — descriptive label, stored on-chain
  visualSeed: number;
  hungerDecayRate: number;
  moodDecayRate: number;
  energyDecayRate: number;
}

export interface MintResult {
  txHash: string;
  blockNumber?: number;
}

/**
 * Sign a `mintPet` ForwardRequest with the user's CloudStorage key,
 * relay it through the backend, return tx hash. The user's tokenId
 * is discoverable afterwards via `api.myPet(wallet.address)`.
 */
export async function mintPet(a: MintArgs): Promise<MintResult> {
  if (!FORWARDER || !ZEROGOCHI) {
    throw new Error("missing NEXT_PUBLIC_FORWARDER / NEXT_PUBLIC_ZEROGOCHI");
  }
  const provider = new JsonRpcProvider(RPC_URL, CHAIN_ID, { staticNetwork: true });
  const signer = signerFromWallet(a.wallet);

  const proofs = [a.personalityHash];
  const descriptions = [a.personalityUri];

  const req = await buildSignedForwardRequest({
    signer,
    provider,
    forwarderAddress: FORWARDER,
    zerogochiAddress: ZEROGOCHI,
    fn: "mintPet",
    args: [
      proofs,
      descriptions,
      a.visualSeed,
      a.hungerDecayRate,
      a.moodDecayRate,
      a.energyDecayRate,
    ],
    gas: 2_500_000n,
  });

  const result = await api.relay(req);
  return { txHash: result.txHash, blockNumber: result.blockNumber };
}
