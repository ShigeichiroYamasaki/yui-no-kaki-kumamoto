import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { keccak256, parseEther, stringToHex, zeroAddress } from "viem";
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

    await fixture.vault.write.setAllowedAsset([jpyc.address, true]);
    await vaultAsSupporter.write.supportERC20([
      jpyc.address,
      30_000n,
      keccak256(stringToHex("JP")),
      keccak256(stringToHex("message")),
      supporter.account.address,
      keccak256(stringToHex("metadata")),
    ]);

    const batchId = keccak256(stringToHex("batch-001"));
    await fixture.vault.write.transferBatch([batchId, jpyc.address, 30_000n]);
    assert.equal(await jpyc.read.balanceOf([beneficiary.account.address]), 30_000n);
    assert.equal(await jpyc.read.balanceOf([fixture.vault.address]), 0n);
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
    await fixture.vault.write.transferBatch([batchId, zeroAddress, parseEther("0.02")]);
    await viem.assertions.revertWithCustomError(
      fixture.vault.write.transferBatch([batchId, zeroAddress, parseEther("0.01")]),
      fixture.vault,
      "DuplicateBatch",
    );

    const vaultAsOutsider = await viem.getContractAt("RecoverySupportVault", fixture.vault.address, { client: { wallet: outsider } });
    await assert.rejects(
      vaultAsOutsider.write.transferBatch([
        keccak256(stringToHex("batch-003")),
        zeroAddress,
        parseEther("0.01"),
      ]),
    );
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
