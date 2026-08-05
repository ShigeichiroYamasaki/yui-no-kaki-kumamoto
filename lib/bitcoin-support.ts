import {
  encodeAbiParameters,
  getAddress,
  keccak256,
  type Address,
  type Hex,
  type TypedDataDomain,
} from "viem";

export const bitcoinSupportIntentTypes = {
  SupportIntent: [
    { name: "route", type: "uint8" },
    { name: "sourceId", type: "bytes32" },
    { name: "sourceIndex", type: "uint32" },
    { name: "amount", type: "uint256" },
    { name: "recipient", type: "address" },
    { name: "publicMetadataHash", type: "bytes32" },
    { name: "expiresAt", type: "uint64" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

export const bitcoinAttestationTypes = {
  Attestation: [
    { name: "intentHash", type: "bytes32" },
    { name: "verifierEpoch", type: "uint64" },
    { name: "observedAt", type: "uint64" },
    { name: "confirmationReference", type: "uint64" },
  ],
} as const;

export type BitcoinSupportIntent = {
  route: 0 | 1;
  sourceId: Hex;
  sourceIndex: number;
  amount: bigint;
  recipient: Address;
  publicMetadataHash: Hex;
  expiresAt: bigint;
  nonce: Hex;
};

export function bitcoinSupportDomain(chainId: number, registry: Address): TypedDataDomain {
  return {
    name: "Kumamoto Bitcoin Support",
    version: "1",
    chainId,
    verifyingContract: getAddress(registry),
  };
}

/** Convert the explorer-style txid into the Registry's public sourceId. */
export function bitcoinTxidSourceId(txid: string): Hex {
  if (!/^[0-9a-fA-F]{64}$/.test(txid)) throw new Error("txid must be exactly 32 bytes of hex");
  return `0x${txid.toLowerCase()}` as Hex;
}

/**
 * Produce the only Lightning identifier that may leave the restricted audit boundary.
 * paymentHash and private intent salt must never be logged or sent to the public frontend.
 */
export function lightningPaymentCommitment(paymentHash: Hex, privateIntentSalt: Hex): Hex {
  return keccak256(
    encodeAbiParameters(
      [{ type: "string" }, { type: "bytes32" }, { type: "bytes32" }],
      ["KUMAMOTO_LIGHTNING_PAYMENT_V1", paymentHash, privateIntentSalt],
    ),
  );
}

export function artworkMetadataHash(
  displayName: string,
  dedicationMessage: string,
  showAmount: boolean,
): Hex {
  return keccak256(
    encodeAbiParameters(
      [{ type: "string" }, { type: "string" }, { type: "bool" }],
      [displayName, dedicationMessage, showAmount],
    ),
  );
}

/** Registry rejects duplicate signers; signatures must follow numeric signer-address order. */
export function sortVerifierSignatures<T extends { signer: Address; signature: Hex }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const left = BigInt(a.signer);
    const right = BigInt(b.signer);
    return left < right ? -1 : left > right ? 1 : 0;
  });
}
