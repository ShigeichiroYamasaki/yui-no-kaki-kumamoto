import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { keccak256, parseEther, stringToHex } from "viem";
import { network } from "hardhat";

describe("RecoverySupportCouncil", async function () {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();
  const [admin, supporter, beneficiary, outsider] = await viem.getWalletClients();
  const MINTER_ROLE = keccak256(stringToHex("MINTER_ROLE"));

  it("allows one advisory vote per SBT holder and cannot move treasury funds", async () => {
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
    await councilAsSupporter.write.vote([1n, true]);
    const proposal = await council.read.proposals([1n]);
    assert.equal(proposal[3], 1n);

    await viem.assertions.revertWithCustomError(
      councilAsSupporter.write.vote([1n, true]),
      council,
      "AlreadyVoted",
    );

    const councilAsOutsider = await viem.getContractAt("RecoverySupportCouncil", council.address, { client: { wallet: outsider } });
    await viem.assertions.revertWithCustomError(
      councilAsOutsider.write.vote([1n, true]),
      council,
      "NoTamagaki",
    );
  });
});
