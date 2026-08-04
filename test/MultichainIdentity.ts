import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Address } from "viem";
import { tamagakiGlobalId } from "../docs/.vitepress/theme/multichainIdentity.js";

describe("multi-chain Tamagaki identity", () => {
  it("separates equal token IDs by chain and SBT contract", () => {
    const baseSbt = "0x1111111111111111111111111111111111111111" as Address;
    const polygonSbt = "0x2222222222222222222222222222222222222222" as Address;
    const baseId = tamagakiGlobalId(8453, baseSbt, 1n);
    const polygonId = tamagakiGlobalId(137, polygonSbt, 1n);

    assert.equal(baseId, "8453:0x1111111111111111111111111111111111111111:1");
    assert.equal(polygonId, "137:0x2222222222222222222222222222222222222222:1");
    assert.notEqual(baseId, polygonId);
  });
});
