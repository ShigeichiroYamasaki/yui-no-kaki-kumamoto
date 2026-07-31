import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSupportTrend, chartPolyline } from "../docs/.vitepress/theme/support-trend.ts";

describe("support trend aggregation", () => {
  it("sorts SupportReceived events and accumulates ETH and JPYC independently", () => {
    const trend = buildSupportTrend([
      { asset: "JPYC", amount: 30_000n, timestamp: 30 },
      { asset: "ETH", amount: 2n, timestamp: 10 },
      { asset: "ETH", amount: 3n, timestamp: 20 },
    ]);

    assert.deepEqual(trend, [
      { eth: 2n, jpyc: 0n, timestamp: 10 },
      { eth: 5n, jpyc: 0n, timestamp: 20 },
      { eth: 5n, jpyc: 30_000n, timestamp: 30 },
    ]);
  });

  it("produces chart coordinates without converting token totals before normalization", () => {
    const trend = buildSupportTrend([
      { asset: "ETH", amount: 1n, timestamp: 10 },
      { asset: "ETH", amount: 1n, timestamp: 20 },
    ]);
    assert.equal(chartPolyline(trend, "eth", 100, 100), "0.0,50.0 100.0,0.0");
  });
});
