"use client";

import { JsonRpcProvider } from "ethers";
import { api } from "./api";
import { buildSignedForwardRequest } from "./forwarder";
import { signerFromWallet, type ZgWallet } from "./wallet";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://evmrpc.0g.ai";
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "16661");
const FORWARDER = process.env.NEXT_PUBLIC_FORWARDER ?? "";
const ZEROGOCHI = process.env.NEXT_PUBLIC_ZEROGOCHI ?? "";

export const isOnchainConfigured = () => Boolean(FORWARDER && ZEROGOCHI);

async function relay(
  wallet: ZgWallet,
  fn: "feed" | "play",
  args: readonly unknown[],
) {
  const provider = new JsonRpcProvider(RPC_URL, CHAIN_ID, { staticNetwork: true });
  const signer = signerFromWallet(wallet);
  const req = await buildSignedForwardRequest({
    signer,
    provider,
    forwarderAddress: FORWARDER,
    zerogochiAddress: ZEROGOCHI,
    fn,
    args,
    gas: 200_000n,
  });
  return api.relay(req);
}

export const onchain = {
  feed: (wallet: ZgWallet, tokenId: number) => relay(wallet, "feed", [tokenId]),
  play: (wallet: ZgWallet, tokenId: number) => relay(wallet, "play", [tokenId]),
};
