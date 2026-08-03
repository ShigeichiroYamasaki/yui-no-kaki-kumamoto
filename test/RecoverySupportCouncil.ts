import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { keccak256, parseEther, stringToHex } from "viem";
import { network } from "hardhat";

describe("RecoverySupportCouncil", async function () {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();
  const [admin, supporter, beneficiary, outsider] = await viem.getWalletClients();
  const MINTER_ROLE = keccak256(stringToHex("MINTER_ROLE"));

  it("uses quadratic voice credits for one advisory ballot per SBT holder", async () => {
    const sbt = await viem.deployContract("TamagakiSBT", [admin.account.address, "ipfs://demo/"]);
    const vault = await viem.deployContract("RecoverySupportVault", [
      admin.account.address,
      beneficiary.account.address,
      sbt.address,
    ]);
    const council = await viem.deployContract("RecoverySupportCouncil", [admin.account.address, sbt.address]);
    await sbt.write.grantRole([MINTER_ROLE, vault.address]);

    const vaultAsSupporter = await viem.getContractAt("RecoverySupportVault", vault.address, { client: { wallet: supporter } });
    await vaultAsSupporter.write.supportNative(
      [
        keccak256(stringToHex("JP")),
        keccak256(stringToHex("message")),
        supporter.account.address,
        keccak256(stringToHex("metadata")),
      ],
      { value: parseEther("0.01") },
    );

    const now = (await publicClient.getBlock()).timestamp;
    await council.write.createProposal([
      keccak256(stringToHex("priority: roads and bridges")),
      now,
      now + 3_600n,
    ]);

    const councilAsSupporter = await viem.getContractAt("RecoverySupportCouncil", council.address, { client: { wallet: supporter } });
    await councilAsSupporter.write.vote([1n, 1n, true, 7]);
    const proposal = await council.read.proposals([1n]);
    assert.equal(proposal[3], 7n);
    assert.equal(await council.read.voiceCreditsSpent([1n, supporter.account.address]), 49);

    await viem.assertions.revertWithCustomError(
      councilAsSupporter.write.vote([1n, 1n, true, 1]),
      council,
      "AlreadyVoted",
    );

    const councilAsOutsider = await viem.getContractAt("RecoverySupportCouncil", council.address, { client: { wallet: outsider } });
    await viem.assertions.revertWithCustomError(
      councilAsOutsider.write.vote([1n, 1n, true, 1]),
      council,
      "NoTamagaki",
    );
  });

  it("rejects vote weights outside the 100-credit quadratic budget", async () => {
    const sbt = await viem.deployContract("TamagakiSBT", [admin.account.address, "ipfs://demo/"]);
    const council = await viem.deployContract("RecoverySupportCouncil", [admin.account.address, sbt.address]);
    await sbt.write.grantRole([MINTER_ROLE, admin.account.address]);
    await sbt.write.mint([admin.account.address, keccak256(stringToHex("support")), keccak256(stringToHex("metadata"))]);
    const now = (await publicClient.getBlock()).timestamp;
    await council.write.createProposal([keccak256(stringToHex("proposal")), now, now + 3_600n]);
    await viem.assertions.revertWithCustomError(council.write.vote([1n, 1n, true, 11]), council, "InvalidVoteWeight");
  });

  it("uses the proposal cutoff and rejects SBTs minted after voting is announced", async () => {
    const sbt = await viem.deployContract("TamagakiSBT", [admin.account.address, "ipfs://demo/"]);
    const council = await viem.deployContract("RecoverySupportCouncil", [admin.account.address, sbt.address]);
    await sbt.write.grantRole([MINTER_ROLE, admin.account.address]);
    const now = (await publicClient.getBlock()).timestamp;
    await council.write.createProposal([keccak256(stringToHex("proposal")), now, now + 3_600n]);
    await sbt.write.mint([supporter.account.address, keccak256(stringToHex("late-support")), keccak256(stringToHex("metadata"))]);
    const councilAsSupporter = await viem.getContractAt("RecoverySupportCouncil", council.address, { client: { wallet: supporter } });
    await viem.assertions.revertWithCustomError(
      councilAsSupporter.write.vote([1n, 1n, true, 1]),
      council,
      "NoTamagaki",
    );
  });
});
