import type { Address } from "viem";

export const tamagakiGlobalId = (chainId: number, sbtContract: Address, tokenId: bigint) =>
  `${chainId}:${sbtContract.toLowerCase()}:${tokenId.toString()}`;
