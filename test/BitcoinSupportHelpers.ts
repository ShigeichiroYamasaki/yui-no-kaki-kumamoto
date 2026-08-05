import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { keccak256, stringToHex } from "viem";
import {
  artworkMetadataHash,
  bitcoinTxidSourceId,
  lightningPaymentCommitment,
  sortVerifierSignatures,
} from "../lib/bitcoin-support.js";

describe("Bitcoin and Lightning support helpers", function () {
  it("validates a Bitcoin txid without reversing its explorer representation", function () {
    const txid = "AA".repeat(32);
    assert.equal(bitcoinTxidSourceId(txid), `0x${"aa".repeat(32)}`);
    assert.throws(() => bitcoinTxidSourceId("abcd"));
  });

  it("domain-separates the public Lightning commitment", function () {
    const paymentHash = keccak256(stringToHex("payment-hash"));
    const first = lightningPaymentCommitment(paymentHash, keccak256(stringToHex("intent-1")));
    const second = lightningPaymentCommitment(paymentHash, keccak256(stringToHex("intent-2")));
    assert.notEqual(first, second);
  });

  it("hashes public artwork fields and sorts verifier signatures", function () {
    assert.match(artworkMetadataHash("Alice", "For Kumamoto", true), /^0x[0-9a-f]{64}$/);
    const sorted = sortVerifierSignatures([
      { signer: "0x0000000000000000000000000000000000000002", signature: "0x02" },
      { signer: "0x0000000000000000000000000000000000000001", signature: "0x01" },
    ]);
    assert.equal(sorted[0].signer, "0x0000000000000000000000000000000000000001");
  });
});
