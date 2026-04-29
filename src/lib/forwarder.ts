"use client";

import { Contract, JsonRpcProvider, TypedDataDomain, Wallet } from "ethers";
import { ZEROGOCHI_ABI, FORWARDER_ABI } from "./abis";

const FORWARDER_TYPES = {
  ForwardRequest: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "gas", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint48" },
    { name: "data", type: "bytes" },
  ],
} as const;

export interface ForwardRequest {
  from: string;
  to: string;
  value: string;
  gas: string;
  deadline: number;
  data: string;
  signature: string;
}

export interface BuildSignedRequestArgs {
  signer: Wallet;
  provider: JsonRpcProvider;
  forwarderAddress: string;
  zerogochiAddress: string;
  /** Function name on Zerogochi to encode (e.g. "mintPet", "feed", "play") */
  fn: string;
  /** Args matching the ABI signature for `fn` */
  args: readonly unknown[];
  /** Gas limit for the inner call */
  gas?: bigint;
  /** Seconds from now until deadline */
  ttlSec?: number;
}

/**
 * Build and sign an EIP-712 ForwardRequest that the relayer will submit.
 * The user's CloudStorage key signs; the relayer pays gas.
 */
export async function buildSignedForwardRequest(
  a: BuildSignedRequestArgs,
): Promise<ForwardRequest> {
  const zerogochi = new Contract(a.zerogochiAddress, ZEROGOCHI_ABI);
  const data = zerogochi.interface.encodeFunctionData(a.fn, a.args as unknown[]);

  const forwarder = new Contract(a.forwarderAddress, FORWARDER_ABI, a.provider);
  const network = await a.provider.getNetwork();
  const nonce: bigint = await forwarder.nonces(a.signer.address);

  const domain: TypedDataDomain = {
    name: "Zerogochi Forwarder",
    version: "1",
    chainId: network.chainId,
    verifyingContract: a.forwarderAddress,
  };

  const ttl = a.ttlSec ?? 3600;
  const deadline = Math.floor(Date.now() / 1000) + ttl;

  const value = {
    from: a.signer.address,
    to: a.zerogochiAddress,
    value: 0n,
    gas: a.gas ?? 1_500_000n,
    nonce,
    deadline,
    data,
  };

  const signature = await a.signer.signTypedData(domain, FORWARDER_TYPES as unknown as Record<string, Array<{ name: string; type: string }>>, value);

  return {
    from: value.from,
    to: value.to,
    value: value.value.toString(),
    gas: value.gas.toString(),
    deadline,
    data,
    signature,
  };
}
