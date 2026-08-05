import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { encodeAbiParameters, getAddress, keccak256, stringToHex, type Address, type Hex } from "viem";

const intentTypes = {
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

const attestationTypes = {
  Attestation: [
    { name: "intentHash", type: "bytes32" },
    { name: "verifierEpoch", type: "uint64" },
    { name: "observedAt", type: "uint64" },
    { name: "confirmationReference", type: "uint64" },
  ],
} as const;

describe("BitcoinSupportRegistry", async function () {
  const { viem } = await network.create();
  const wallets = await viem.getWalletClients();
  const [admin, supporter, outsider] = wallets;
  const verifierWallets = wallets.slice(3, 6).sort((a, b) =>
    BigInt(a.account.address) < BigInt(b.account.address) ? -1 : 1
  );
  const publicClient = await viem.getPublicClient();
  const chainId = await publicClient.getChainId();

  async function fixture() {
    const sbt = await viem.deployContract("TamagakiSBT", [admin.account.address, ""]);
    const registry = await viem.deployContract("BitcoinSupportRegistry", [
      admin.account.address,
      sbt.address,
      2n,
      verifierWallets.map((wallet) => wallet.account.address),
      BigInt(chainId),
    ]);
    const minterRole = keccak256(stringToHex("MINTER_ROLE"));
    const reporterRole = keccak256(stringToHex("REPORTER_ROLE"));
    await sbt.write.grantRole([minterRole, registry.address]);
    await sbt.write.grantRole([reporterRole, registry.address]);
    return { sbt, registry };
  }

  async function signedRequest(
    registryAddress: Address,
    route: 0 | 1,
    sourceId: Hex,
    sourceIndex: number,
    nonceLabel: string,
  ) {
    const artwork = {
      displayName: route === 0 ? "Satoshi Supporter" : "Lightning Friend",
      dedicationMessage: "For Kumamoto",
      showAmount: true,
    };
    const publicMetadataHash = keccak256(
      // Matches Solidity keccak256(abi.encode(string,string,bool)).
      encodeAbiParameters(
        [{ type: "string" }, { type: "string" }, { type: "bool" }],
        [artwork.displayName, artwork.dedicationMessage, artwork.showAmount],
      ),
    );
    const block = await publicClient.getBlock();
    const intent = {
      route,
      sourceId,
      sourceIndex,
      amount: route === 0 ? 150_000n : 150_000_000n,
      recipient: supporter.account.address,
      publicMetadataHash,
      expiresAt: block.timestamp + 3_600n,
      nonce: keccak256(stringToHex(nonceLabel)),
    };
    const domain = {
      name: "Kumamoto Bitcoin Support",
      version: "1",
      chainId,
      verifyingContract: registryAddress,
    } as const;
    const supporterSignature = await supporter.signTypedData({
      domain,
      types: intentTypes,
      primaryType: "SupportIntent",
      message: intent,
    });
    const intentHash = await (await viem.getContractAt("BitcoinSupportRegistry", registryAddress)).read.hashIntent([intent]);
    const attestation = {
      intentHash,
      verifierEpoch: 1n,
      observedAt: block.timestamp,
      confirmationReference: route === 0 ? 920_001n : block.timestamp,
    };
    const verifierSignatures = await Promise.all(
      verifierWallets.slice(0, 2).map((wallet) => wallet.signTypedData({
        domain,
        types: attestationTypes,
        primaryType: "Attestation",
        message: attestation,
      })),
    );
    return { artwork, intent, supporterSignature, attestation, verifierSignatures, intentHash };
  }

  it("threshold-attests a Bitcoin outpoint and mints exactly one Base SBT", async () => {
    const { sbt, registry } = await fixture();
    const sourceId = keccak256(stringToHex("bitcoin-txid-001"));
    const request = await signedRequest(
      registry.address,
      0,
      sourceId,
      1,
      "btc-intent-001",
    );

    await viem.assertions.emit(
      registry.write.attestAndMint([
        request.intent,
        request.supporterSignature,
        request.attestation,
        request.verifierSignatures,
        request.artwork,
      ]),
      registry,
      "BitcoinTamagakiIssued",
    );

    const record = await registry.read.support([request.intentHash]);
    assert.equal(record.tokenId, 1n);
    assert.equal(record.status, 2);
    assert.equal(getAddress(await sbt.read.ownerOf([1n])), getAddress(supporter.account.address));

    await viem.assertions.revertWithCustomError(
      registry.write.attestAndMint([
        request.intent,
        request.supporterSignature,
        request.attestation,
        request.verifierSignatures,
        request.artwork,
      ]),
      registry,
      "DuplicateNonce",
    );

    const replayedOutpoint = await signedRequest(
      registry.address,
      0,
      sourceId,
      1,
      "different-intent-same-outpoint",
    );
    await viem.assertions.revertWithCustomError(
      registry.write.attestAndMint([
        replayedOutpoint.intent,
        replayedOutpoint.supporterSignature,
        replayedOutpoint.attestation,
        replayedOutpoint.verifierSignatures,
        replayedOutpoint.artwork,
      ]),
      registry,
      "DuplicateEvidence",
    );
  });

  it("records only a public Lightning commitment and uses millisatoshi precision", async () => {
    const { sbt, registry } = await fixture();
    const publicCommitment = keccak256(stringToHex("domain-separated-lightning-commitment"));
    const request = await signedRequest(registry.address, 1, publicCommitment, 0, "ln-intent-001");
    await registry.write.attestAndMint([
      request.intent,
      request.supporterSignature,
      request.attestation,
      request.verifierSignatures,
      request.artwork,
    ]);

    const record = await registry.read.support([request.intentHash]);
    assert.equal(record.sourceId, publicCommitment);
    assert.equal(record.sourceIndex, 0);
    const art = await sbt.read.artwork([1n]);
    assert.equal(art.assetLabel, "BTC-LN");
    assert.equal(art.assetDecimals, 11);
  });

  it("rejects one verifier, an invalid supporter signature, and stale verifier epochs", async () => {
    const { registry } = await fixture();
    const request = await signedRequest(
      registry.address,
      0,
      keccak256(stringToHex("bitcoin-txid-002")),
      0,
      "btc-intent-002",
    );
    await viem.assertions.revertWithCustomError(
      registry.write.attestAndMint([
        request.intent,
        request.supporterSignature,
        request.attestation,
        request.verifierSignatures.slice(0, 1),
        request.artwork,
      ]),
      registry,
      "InsufficientAttestations",
    );

    const badSignature = await outsider.signTypedData({
      domain: {
        name: "Kumamoto Bitcoin Support",
        version: "1",
        chainId,
        verifyingContract: registry.address,
      },
      types: intentTypes,
      primaryType: "SupportIntent",
      message: request.intent,
    });
    await viem.assertions.revertWithCustomError(
      registry.write.attestAndMint([
        request.intent,
        badSignature,
        request.attestation,
        request.verifierSignatures,
        request.artwork,
      ]),
      registry,
      "InvalidSupporterSignature",
    );

    await registry.write.replaceVerifierSet([
      verifierWallets.map((wallet) => wallet.account.address),
      2n,
    ]);
    await viem.assertions.revertWithCustomError(
      registry.write.attestAndMint([
        request.intent,
        request.supporterSignature,
        request.attestation,
        request.verifierSignatures,
        request.artwork,
      ]),
      registry,
      "InvalidAttestation",
    );
  });
});
