<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import {
  createPublicClient,
  formatUnits,
  http,
  parseAbiItem,
  zeroAddress,
  type Address,
} from "viem";
import { buildSupportTrend, chartPolyline, type SupportEventPoint } from "../support-trend";

const props = defineProps<{ locale: "ja" | "en" }>();
const rpcUrl = import.meta.env.VITE_RECOVERY_RPC_URL as string | undefined;
const vaultAddress = import.meta.env.VITE_RECOVERY_VAULT_ADDRESS as Address | undefined;
const jpycAddress = import.meta.env.VITE_JPYC_ADDRESS as Address | undefined;
const deploymentBlock = BigInt(import.meta.env.VITE_RECOVERY_DEPLOYMENT_BLOCK || "0");
const jpycDecimals = Number(import.meta.env.VITE_JPYC_DECIMALS || "18");
const configured = Boolean(rpcUrl && vaultAddress && jpycAddress);
const eventDefinition = parseAbiItem(
  "event SupportReceived(bytes32 indexed supportId, address indexed supporter, address indexed asset, uint256 amount, bytes32 countryCodeHash, bytes32 messageHash, uint256 tokenId)",
);

const loading = ref(configured);
const error = ref("");
const lastUpdated = ref<Date>();
const events = ref<SupportEventPoint[]>([]);
let refreshTimer: ReturnType<typeof setInterval> | undefined;

const trend = computed(() => buildSupportTrend(events.value));
const latest = computed(() => trend.value.at(-1) ?? { eth: 0n, jpyc: 0n, timestamp: 0 });
const ethTotal = computed(() => Number(formatUnits(latest.value.eth, 18)).toLocaleString(undefined, { maximumFractionDigits: 4 }));
const jpycTotal = computed(() => Number(formatUnits(latest.value.jpyc, jpycDecimals)).toLocaleString(undefined, { maximumFractionDigits: 0 }));
const ethLine = computed(() => chartPolyline(trend.value, "eth"));
const jpycLine = computed(() => chartPolyline(trend.value, "jpyc"));
const supportCount = computed(() => events.value.length.toLocaleString());
const dateRange = computed(() => {
  if (!trend.value.length) return "—";
  const format = new Intl.DateTimeFormat(props.locale === "ja" ? "ja-JP" : "en-US", { month: "short", day: "numeric" });
  return `${format.format(new Date(trend.value[0].timestamp * 1000))} – ${format.format(new Date(trend.value.at(-1)!.timestamp * 1000))}`;
});

async function refresh() {
  if (!configured || !rpcUrl || !vaultAddress || !jpycAddress) return;
  loading.value = true;
  error.value = "";
  try {
    const client = createPublicClient({ transport: http(rpcUrl) });
    const toBlock = await client.getBlockNumber();
    const logs = await client.getLogs({
      address: vaultAddress,
      event: eventDefinition,
      fromBlock: deploymentBlock,
      toBlock,
    });
    const blockNumbers = [...new Set(logs.map((log) => log.blockNumber))];
    const blocks = await Promise.all(blockNumbers.map((blockNumber) => client.getBlock({ blockNumber })));
    const timestamps = new Map(blocks.map((block) => [block.number, Number(block.timestamp)]));
    events.value = logs.flatMap((log) => {
      const asset = log.args.asset?.toLowerCase();
      const amount = log.args.amount;
      if (amount === undefined || !asset) return [];
      if (asset !== zeroAddress && asset !== jpycAddress.toLowerCase()) return [];
      return [{
        asset: asset === zeroAddress ? "ETH" as const : "JPYC" as const,
        amount,
        timestamp: timestamps.get(log.blockNumber) ?? 0,
      }];
    });
    lastUpdated.value = new Date();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void refresh();
  if (configured) refreshTimer = setInterval(() => void refresh(), 30_000);
});

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer);
});
</script>

<template>
  <section class="support-trend" aria-labelledby="support-trend-title">
    <div class="support-trend__heading">
      <div>
        <p class="whitepaper-hero__eyebrow">ON-CHAIN SUPPORT</p>
        <h2 id="support-trend-title">{{ locale === "ja" ? "支援金額の推移" : "Support received over time" }}</h2>
      </div>
      <span class="support-trend__status" :class="{ live: configured && !error }">
        {{ configured ? (loading ? (locale === "ja" ? "同期中" : "Syncing") : (locale === "ja" ? "オンチェーン" : "On-chain")) : (locale === "ja" ? "接続待ち" : "Awaiting connection") }}
      </span>
    </div>

    <div class="support-trend__totals">
      <article><span>Ether</span><strong>{{ ethTotal }}</strong><small>ETH</small></article>
      <article><span>JPYC</span><strong>{{ jpycTotal }}</strong><small>JPYC</small></article>
      <article><span>{{ locale === "ja" ? "支援件数" : "Contributions" }}</span><strong>{{ supportCount }}</strong><small>{{ locale === "ja" ? "件" : "events" }}</small></article>
    </div>

    <div v-if="trend.length" class="support-trend__chart">
      <svg viewBox="0 0 680 180" role="img" :aria-label="locale === 'ja' ? 'ETHとJPYCの累計推移' : 'Cumulative ETH and JPYC trend'">
        <line v-for="y in [0, 45, 90, 135, 180]" :key="y" x1="0" :y1="y" x2="680" :y2="y" />
        <polyline class="eth" :points="ethLine" />
        <polyline class="jpyc" :points="jpycLine" />
      </svg>
      <div class="support-trend__legend"><span class="eth">ETH</span><span class="jpyc">JPYC</span><time>{{ dateRange }}</time></div>
    </div>
    <div v-else class="support-trend__empty">
      <strong>{{ locale === "ja" ? "オンチェーンデータはまだ接続されていません" : "On-chain data is not connected yet" }}</strong>
      <span>{{ locale === "ja" ? "テストネットへデプロイ後、公開RPCとコントラクトアドレスを設定すると30秒ごとに自動更新します。" : "After testnet deployment, configure the public RPC and contract addresses to refresh automatically every 30 seconds." }}</span>
    </div>
    <p v-if="error" class="support-trend__error">{{ locale === "ja" ? "取得エラー: " : "Data error: " }}{{ error }}</p>
    <p class="support-trend__updated">{{ lastUpdated ? `${locale === "ja" ? "最終更新" : "Last updated"}: ${lastUpdated.toLocaleTimeString()}` : (locale === "ja" ? "表示値はSupportReceivedイベントから集計されます。" : "Values are aggregated from SupportReceived events.") }}</p>
  </section>
</template>
