import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { keccak256, stringToHex } from "viem";
import { network } from "hardhat";

describe("RecoveryAttestationRegistry", async function () {
  const { viem } = await network.create();
  const [admin, reporter, outsider] = await viem.getWalletClients();

  it("records one immutable delivery confirmation per batch", async () => {
    const registry = await viem.deployContract("RecoveryAttestationRegistry", [
      admin.account.address,
      reporter.account.address,
    ]);
    const registryAsReporter = await viem.getContractAt("RecoveryAttestationRegistry", registry.address, { client: { wallet: reporter } });
    const batchId = keccak256(stringToHex("batch-001"));
    const receiptHash = keccak256(stringToHex("prefecture receipt"));

    await viem.assertions.emit(
      registryAsReporter.write.confirmDelivery([batchId, 14_210_000n, receiptHash]),
      registry,
      "DeliveryConfirmed",
    );

    const delivery = await registry.read.deliveries([batchId]);
    assert.equal(delivery[0], 14_210_000n);
    assert.equal(delivery[1], receiptHash);

    await viem.assertions.revertWithCustomError(
      registryAsReporter.write.confirmDelivery([batchId, 1n, receiptHash]),
      registry,
      "AlreadyRecorded",
    );
  });

  it("rejects unauthorized reports and progress above 100 percent", async () => {
    const registry = await viem.deployContract("RecoveryAttestationRegistry", [
      admin.account.address,
      reporter.account.address,
    ]);
    const reportId = keccak256(stringToHex("report-001"));
    const projectId = keccak256(stringToHex("KRI-2026-014"));
    const documentHash = keccak256(stringToHex("report document"));

    const registryAsOutsider = await viem.getContractAt("RecoveryAttestationRegistry", registry.address, { client: { wallet: outsider } });
    await assert.rejects(
      registryAsOutsider.write.publishProjectReport([reportId, projectId, 6_800, 12_000_000n, documentHash]),
    );

    const registryAsReporter = await viem.getContractAt("RecoveryAttestationRegistry", registry.address, { client: { wallet: reporter } });
    await viem.assertions.revertWithCustomError(
      registryAsReporter.write.publishProjectReport([reportId, projectId, 10_001, 12_000_000n, documentHash]),
      registry,
      "InvalidProgress",
    );
  });

  it("preserves corrections as linked successor attestations", async () => {
    const registry = await viem.deployContract("RecoveryAttestationRegistry", [
      admin.account.address,
      reporter.account.address,
    ]);
    const registryAsReporter = await viem.getContractAt("RecoveryAttestationRegistry", registry.address, { client: { wallet: reporter } });
    const first = keccak256(stringToHex("batch-original"));
    const successor = keccak256(stringToHex("batch-correction"));
    await registryAsReporter.write.confirmDelivery([
      first, 100n, keccak256(stringToHex("wrong-receipt")),
    ]);
    await registryAsReporter.write.supersedeDelivery([
      first, successor, 90n, keccak256(stringToHex("correct-receipt")),
    ]);
    assert.equal(await registry.read.deliverySuccessor([first]), successor);
    assert.equal((await registry.read.deliveries([successor]))[0], 90n);
  });
});
