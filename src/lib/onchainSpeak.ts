"use client";

import { JsonRpcProvider, keccak256, toUtf8Bytes } from "ethers";
import { api } from "./api";
import { buildSignedForwardRequest } from "./forwarder";
import { signerFromWallet, type ZgWallet } from "./wallet";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://evmrpc.0g.ai";
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "16661");
const FORWARDER = process.env.NEXT_PUBLIC_FORWARDER ?? "";
const ZEROGOCHI = process.env.NEXT_PUBLIC_ZEROGOCHI ?? "";

/**
 * Fire-and-forget `logSpoke(tokenId, hash)` so the pet's on-chain history
 * records "this conversation happened". Hash is keccak256 of the user's
 * message — provable but not revealing.
 */
export async function logSpokeOnChain(
  wallet: ZgWallet,
  tokenId: number,
  userMessage: string,
): Promise<string | null> {
  if (!FORWARDER || !ZEROGOCHI) return null;
  try {
    const provider = new JsonRpcProvider(RPC_URL, CHAIN_ID, { staticNetwork: true });
    const signer = signerFromWallet(wallet);
    const dialogueHash = keccak256(toUtf8Bytes(userMessage));
    const req = await buildSignedForwardRequest({
      signer,
      provider,
      forwarderAddress: FORWARDER,
      zerogochiAddress: ZEROGOCHI,
      fn: "logSpoke",
      args: [tokenId, dialogueHash],
      gas: 200_000n,
    });
    const result = await api.relay(req);
    return result.txHash;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("logSpoke failed:", err);
    return null;
  }
}
