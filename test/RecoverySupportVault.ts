import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { keccak256, maxUint256, parseEther, stringToHex, zeroAddress } from "viem";
import { network } from "hardhat";

describe("RecoverySupportVault", async function () {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();
  const [admin, supporter, beneficiary, outsider] = await viem.getWalletClients();
  const MINTER_ROLE = keccak256(stringToHex("MINTER_ROLE"));

  async function deployFixture() {
    const sbt = await viem.deployContract("TamagakiSBT", [admin.account.address, "ipfs://demo/"]);
    const vault = await viem.deployContract("RecoverySupportVault", [
      admin.account.address,
      beneficiary.account.address,
      sbt.address,
      0,
      0n,
      true,
      maxUint256,
      maxUint256,
      maxUint256,
    ]);
    await sbt.write.grantRole([MINTER_ROLE, vault.address]);
    return { sbt, vault };
  }

  let fixture: Awaited<ReturnType<typeof deployFixture>>;
  beforeEach(async () => {
    fixture = await deployFixture();
  });

  it("accepts native support and mints a locked Tamagaki SBT", async () => {
    const vaultAsSupporter = await viem.getContractAt("RecoverySupportVault", fixture.vault.address, { client: { wallet: supporter } });
    const countryHash = keccak256(stringToHex("JP"));
    const messageHash = keccak256(stringToHex("support Kumamoto"));
    const metadataHash = keccak256(stringToHex("public metadata"));

    await viem.assertions.emit(
      vaultAsSupporter.write.supportNative(
        [countryHash, messageHash, supporter.account.address, metadataHash],
        { value: parseEther("0.1") },
      ),
      fixture.vault,
      "SupportReceived",
    );

    assert.equal((await fixture.sbt.read.ownerOf([1n])).toLowerCase(), supporter.account.address.toLowerCase());
    assert.equal(await fixture.sbt.read.locked([1n]), true);
    assert.equal(await fixture.vault.read.totalReceived([zeroAddress]), parseEther("0.1"));
  });

  it("mints an SBT with editable-before-payment on-chain artwork metadata", async () => {
    const vaultAsSupporter = await viem.getContractAt("RecoverySupportVault", fixture.vault.address, { client: { wallet: supporter } });
    const metadataHash = keccak256(stringToHex("canonical artwork metadata"));
    await vaultAsSupporter.write.supportNativeWithMetadata(
      [
        keccak256(stringToHex("JP")),
        keccak256(stringToHex("熊本の復興を応援します")),
        supporter.account.address,
        metadataHash,
        {
          displayName: "山崎 茂一郎",
          dedicationMessage: "熊本の復興を応援します",
          showAmount: true,
        },
      ],
      { value: parseEther("0.125") },
    );

    const artwork = await fixture.sbt.read.artwork([1n]);
    assert.equal(artwork.displayName, "山崎 茂一郎");
    assert.equal(artwork.dedicationMessage, "熊本の復興を応援します");
    assert.equal(artwork.assetLabel, "ETH");
    assert.equal(artwork.amount, parseEther("0.125"));
    assert.equal(artwork.showAmount, true);

    const tokenUri = await fixture.sbt.read.tokenURI([1n]);
    assert.match(tokenUri, /^data:application\/json;base64,/);
    const json = JSON.parse(Buffer.from(tokenUri.split(",")[1], "base64").toString("utf8"));
    assert.match(json.image, /^data:image\/svg\+xml;base64,/);
    const svg = Buffer.from(json.image.split(",")[1], "base64").toString("utf8");
    assert.match(svg, /山崎 茂一郎/);
    assert.match(svg, /0.125 ETH/);
    assert.match(svg, /熊本の復興を応援します/);
  });

  it("allows an empty optional dedication and omits a hidden amount from token metadata", async () => {
    const vaultAsSupporter = await viem.getContractAt("RecoverySupportVault", fixture.vault.address, { client: { wallet: supporter } });
    await vaultAsSupporter.write.supportNativeWithMetadata(
      [
        keccak256(stringToHex("CA")),
        keccak256(stringToHex("")),
        supporter.account.address,
        keccak256(stringToHex("nickname-only metadata")),
        {
          displayName: "Alice",
          dedicationMessage: "",
          showAmount: false,
        },
      ],
      { value: parseEther("0.25") },
    );

    const tokenUri = await fixture.sbt.read.tokenURI([1n]);
    const json = JSON.parse(Buffer.from(tokenUri.split(",")[1], "base64").toString("utf8")) as {
      image: string;
      attributes: Array<{ trait_type: string; value: string }>;
    };
    assert.equal(json.attributes.some((attribute) => attribute.trait_type === "Amount"), false);
    const svg = Buffer.from(json.image.split(",")[1], "base64").toString("utf8");
    assert.match(svg, /Alice/);
    assert.match(svg, /金額非公開/);
    assert.doesNotMatch(svg, /0\.25 ETH/);
  });

  it("prevents transfer of a Tamagaki SBT", async () => {
    const vaultAsSupporter = await viem.getContractAt("RecoverySupportVault", fixture.vault.address, { client: { wallet: supporter } });
    await vaultAsSupporter.write.supportNative(
      [
        keccak256(stringToHex("JP")),
        keccak256(stringToHex("message")),
        supporter.account.address,
        keccak256(stringToHex("metadata")),
      ],
      { value: parseEther("0.01") },
    );

    const sbtAsSupporter = await viem.getContractAt("TamagakiSBT", fixture.sbt.address, { client: { wallet: supporter } });
    await viem.assertions.revertWithCustomError(
      sbtAsSupporter.write.transferFrom([supporter.account.address, outsider.account.address, 1n]),
      fixture.sbt,
      "Soulbound",
    );
  });

  it("accepts only allowlisted ERC-20 and forwards a batch only to the beneficiary", async () => {
    const jpyc = await viem.deployContract("MockJPYC");
    const jpycAsSupporter = await viem.getContractAt("MockJPYC", jpyc.address, { client: { wallet: supporter } });
    await jpycAsSupporter.write.faucet();
    const vaultAsSupporter = await viem.getContractAt("RecoverySupportVault", fixture.vault.address, { client: { wallet: supporter } });
    await jpycAsSupporter.write.approve([fixture.vault.address, 100_000n]);

    await viem.assertions.revertWithCustomError(
      vaultAsSupporter.write.supportERC20([
        jpyc.address,
        30_000n,
        keccak256(stringToHex("JP")),
        keccak256(stringToHex("message")),
        supporter.account.address,
        keccak256(stringToHex("metadata")),
      ]),
      fixture.vault,
      "AssetNotAllowed",
    );

    await fixture.vault.write.configureAsset([jpyc.address, true, maxUint256, maxUint256, maxUint256]);
    await vaultAsSupporter.write.supportERC20([
      jpyc.address,
      30_000n,
      keccak256(stringToHex("JP")),
      keccak256(stringToHex("message")),
      supporter.account.address,
      keccak256(stringToHex("metadata")),
    ]);

    const batchId = keccak256(stringToHex("batch-001"));
    const now = (await publicClient.getBlock()).timestamp;
    await fixture.vault.write.transferBatch([
      batchId,
      jpyc.address,
      30_000n,
      keccak256(stringToHex("support-root-001")),
      keccak256(stringToHex("settlement-instruction-001")),
      now + 3_600n,
    ]);
    assert.equal(await jpyc.read.balanceOf([beneficiary.account.address]), 30_000n);
    assert.equal(await jpyc.read.balanceOf([fixture.vault.address]), 0n);
  });

  it("enforces fixed native-only and ERC20-only deployment policies", async () => {
    const token = await viem.deployContract("MockJPYC");
    const nativeOnlySbt = await viem.deployContract("TamagakiSBT", [admin.account.address, "ipfs://base/"]);
    const nativeOnlyVault = await viem.deployContract("RecoverySupportVault", [
      admin.account.address,
      beneficiary.account.address,
      nativeOnlySbt.address,
      1,
      0n,
      true,
      1_000n,
      1_000n,
      1_000n,
    ]);
    await viem.assertions.revertWithCustomError(
      nativeOnlyVault.write.configureAsset([token.address, true, 1_000n, 1_000n, 1_000n]),
      nativeOnlyVault,
      "AssetTypeForbidden",
    );

    const erc20OnlySbt = await viem.deployContract("TamagakiSBT", [admin.account.address, "ipfs://polygon/"]);
    const erc20OnlyVault = await viem.deployContract("RecoverySupportVault", [
      admin.account.address,
      beneficiary.account.address,
      erc20OnlySbt.address,
      2,
      0n,
      false,
      0n,
      0n,
      0n,
    ]);
    await viem.assertions.revertWithCustomError(
      erc20OnlyVault.write.configureAsset([zeroAddress, true, 1_000n, 1_000n, 1_000n]),
      erc20OnlyVault,
      "AssetTypeForbidden",
    );
    const erc20VaultAsSupporter = await viem.getContractAt("RecoverySupportVault", erc20OnlyVault.address, {
      client: { wallet: supporter },
    });
    await viem.assertions.revertWithCustomError(
      erc20VaultAsSupporter.write.supportNative([
        keccak256(stringToHex("JP")),
        keccak256(stringToHex("message")),
        supporter.account.address,
        keccak256(stringToHex("metadata")),
      ], { value: 1n }),
      erc20OnlyVault,
      "AssetNotAllowed",
    );
  });

  it("rejects deployment on an unexpected chain", async () => {
    const sbt = await viem.deployContract("TamagakiSBT", [admin.account.address, "ipfs://wrong-chain/"]);
    await assert.rejects(
      viem.deployContract("RecoverySupportVault", [
        admin.account.address,
        beneficiary.account.address,
        sbt.address,
        1,
        8453n,
        true,
        1_000n,
        1_000n,
        1_000n,
      ]),
    );
  });

  it("dispenses demo JPYC from the faucet and enforces its cooldown", async () => {
    const jpyc = await viem.deployContract("MockJPYC");
    const jpycAsSupporter = await viem.getContractAt("MockJPYC", jpyc.address, { client: { wallet: supporter } });
    await jpycAsSupporter.write.faucet();
    assert.equal(await jpyc.read.balanceOf([supporter.account.address]), await jpyc.read.FAUCET_AMOUNT());
    await viem.assertions.revertWithCustomError(jpycAsSupporter.write.faucet(), jpyc, "FaucetCooldown");
  });

  it("rejects duplicate batch transfers and unauthorized treasury actions", async () => {
    const vaultAsSupporter = await viem.getContractAt("RecoverySupportVault", fixture.vault.address, { client: { wallet: supporter } });
    await vaultAsSupporter.write.supportNative(
      [
        keccak256(stringToHex("JP")),
        keccak256(stringToHex("message")),
        supporter.account.address,
        keccak256(stringToHex("metadata")),
      ],
      { value: parseEther("0.04") },
    );

    const batchId = keccak256(stringToHex("batch-002"));
    const now = (await publicClient.getBlock()).timestamp;
    const root = keccak256(stringToHex("support-root-002"));
    const instruction = keccak256(stringToHex("settlement-instruction-002"));
    await fixture.vault.write.transferBatch([
      batchId, zeroAddress, parseEther("0.02"), root, instruction, now + 3_600n,
    ]);
    await viem.assertions.revertWithCustomError(
      fixture.vault.write.transferBatch([
        batchId, zeroAddress, parseEther("0.01"), root, instruction, now + 3_600n,
      ]),
      fixture.vault,
      "DuplicateBatch",
    );

    const vaultAsOutsider = await viem.getContractAt("RecoverySupportVault", fixture.vault.address, { client: { wallet: outsider } });
    await assert.rejects(
      vaultAsOutsider.write.transferBatch([
        keccak256(stringToHex("batch-003")),
        zeroAddress,
        parseEther("0.01"),
        keccak256(stringToHex("support-root-003")),
        keccak256(stringToHex("settlement-instruction-003")),
        now + 3_600n,
      ]),
    );
  });

  it("records the actual received amount for fee-on-transfer assets", async () => {
    const token = await viem.deployContract("FeeOnTransferToken");
    await token.write.faucet([supporter.account.address, 10_000n]);
    await fixture.vault.write.configureAsset([
      token.address, true, maxUint256, maxUint256, maxUint256,
    ]);
    const tokenAsSupporter = await viem.getContractAt("FeeOnTransferToken", token.address, { client: { wallet: supporter } });
    const vaultAsSupporter = await viem.getContractAt("RecoverySupportVault", fixture.vault.address, { client: { wallet: supporter } });
    await tokenAsSupporter.write.approve([fixture.vault.address, 10_000n]);
    await vaultAsSupporter.write.supportERC20([
      token.address,
      10_000n,
      keccak256(stringToHex("JP")),
      keccak256(stringToHex("message")),
      supporter.account.address,
      keccak256(stringToHex("metadata")),
    ]);
    assert.equal(await token.read.balanceOf([fixture.vault.address]), 9_900n);
    assert.equal(await fixture.vault.read.totalReceived([token.address]), 9_900n);
  });

  it("requires self-recipient SBTs and delayed beneficiary changes", async () => {
    const vaultAsSupporter = await viem.getContractAt("RecoverySupportVault", fixture.vault.address, { client: { wallet: supporter } });
    await viem.assertions.revertWithCustomError(
      vaultAsSupporter.write.supportNative([
        keccak256(stringToHex("JP")),
        keccak256(stringToHex("message")),
        outsider.account.address,
        keccak256(stringToHex("metadata")),
      ], { value: 1n }),
      fixture.vault,
      "InvalidRecipient",
    );

    await fixture.vault.write.proposeBeneficiary([outsider.account.address]);
    await viem.assertions.revertWithCustomError(
      fixture.vault.write.executeBeneficiaryChange(),
      fixture.vault,
      "BeneficiaryDelayActive",
    );
  });

  it("enforces asset caps, batch manifests, and settlement expiry", async () => {
    const vaultAsSupporter = await viem.getContractAt("RecoverySupportVault", fixture.vault.address, { client: { wallet: supporter } });
    await fixture.vault.write.configureAsset([zeroAddress, true, 100n, 60n, 80n]);
    await vaultAsSupporter.write.supportNative(
      [
        keccak256(stringToHex("JP")),
        keccak256(stringToHex("message")),
        supporter.account.address,
        keccak256(stringToHex("metadata")),
      ],
      { value: 100n },
    );
    await viem.assertions.revertWithCustomError(
      vaultAsSupporter.write.supportNative(
        [
          keccak256(stringToHex("JP")),
          keccak256(stringToHex("message-2")),
          supporter.account.address,
          keccak256(stringToHex("metadata-2")),
        ],
        { value: 1n },
      ),
      fixture.vault,
      "BalanceCapExceeded",
    );

    const now = (await publicClient.getBlock()).timestamp;
    const root = keccak256(stringToHex("support-root-capped"));
    const instruction = keccak256(stringToHex("instruction-capped"));
    await viem.assertions.revertWithCustomError(
      fixture.vault.write.transferBatch([
        keccak256(stringToHex("expired")), zeroAddress, 1n, root, instruction, now - 1n,
      ]),
      fixture.vault,
      "ExpiredBatch",
    );
    await viem.assertions.revertWithCustomError(
      fixture.vault.write.transferBatch([
        keccak256(stringToHex("over-batch-cap")), zeroAddress, 61n, root, instruction, now + 3_600n,
      ]),
      fixture.vault,
      "BatchCapExceeded",
    );
  });

  it("can disable an allowlisted token even when its metadata calls start reverting", async () => {
    const token = await viem.deployContract("BreakableMetadataToken");
    await fixture.vault.write.configureAsset([
      token.address, true, maxUint256, maxUint256, maxUint256,
    ]);
    await token.write.breakMetadata();

    await fixture.vault.write.configureAsset([token.address, false, 0n, 0n, 0n]);
    assert.equal(await fixture.vault.read.allowedAsset([token.address]), false);
  });

  it("preserves the accounting invariant for native support", async () => {
    const vaultAsSupporter = await viem.getContractAt("RecoverySupportVault", fixture.vault.address, { client: { wallet: supporter } });
    await vaultAsSupporter.write.supportNative(
      [
        keccak256(stringToHex("US")),
        keccak256(stringToHex("message")),
        zeroAddress,
        keccak256(stringToHex("metadata")),
      ],
      { value: parseEther("0.25") },
    );

    assert.equal(await publicClient.getBalance({ address: fixture.vault.address }), parseEther("0.25"));
    assert.equal(await fixture.vault.read.totalReceived([zeroAddress]), parseEther("0.25"));
  });
});
