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
import { base, polygon } from "viem/chains";
import { buildSupportTrend, chartPolyline, type SupportEventPoint } from "../support-trend";

const props = defineProps<{ locale: "ja" | "en"; network: "base" | "polygon" }>();
const isBase = props.network === "base";
const chain = isBase ? base : polygon;
const networkLabel = isBase ? "Base Mainnet" : "Polygon PoS";
const titleId = `mainnet-support-title-${props.network}`;
const rpcUrl = (isBase
  ? import.meta.env.VITE_BASE_MAINNET_RPC_URL || import.meta.env.VITE_MAINNET_RPC_URL
  : import.meta.env.VITE_POLYGON_MAINNET_RPC_URL) as string | undefined;
const vaultAddress = (isBase
  ? import.meta.env.VITE_BASE_MAINNET_VAULT_ADDRESS || import.meta.env.VITE_MAINNET_VAULT_ADDRESS
  : import.meta.env.VITE_POLYGON_MAINNET_VAULT_ADDRESS) as Address | undefined;
const jpycAddress = (isBase ? undefined : import.meta.env.VITE_POLYGON_MAINNET_JPYC_ADDRESS) as Address | undefined;
const deploymentBlockValue = (isBase
  ? import.meta.env.VITE_BASE_MAINNET_DEPLOYMENT_BLOCK || import.meta.env.VITE_MAINNET_DEPLOYMENT_BLOCK
  : import.meta.env.VITE_POLYGON_MAINNET_DEPLOYMENT_BLOCK) as string | undefined;
const deploymentBlock = BigInt(deploymentBlockValue || "0");
const jpycDecimals = Number(import.meta.env.VITE_POLYGON_MAINNET_JPYC_DECIMALS || "18");
const configured = Boolean(rpcUrl && vaultAddress && deploymentBlockValue && (isBase || jpycAddress));
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
const ethTotal = computed(() => Number(formatUnits(latest.value.eth, 18)).toLocaleString(undefined, { maximumFractionDigits: 6 }));
const jpycTotal = computed(() => Number(formatUnits(latest.value.jpyc, jpycDecimals)).toLocaleString(undefined, { maximumFractionDigits: 2 }));
const ethLine = computed(() => chartPolyline(trend.value, "eth"));
const jpycLine = computed(() => chartPolyline(trend.value, "jpyc"));
const supportCount = computed(() => events.value.length.toLocaleString());
const dateRange = computed(() => {
  if (!trend.value.length) return "—";
  const format = new Intl.DateTimeFormat(props.locale === "ja" ? "ja-JP" : "en-US", { month: "short", day: "numeric" });
  return `${format.format(new Date(trend.value[0].timestamp * 1000))} – ${format.format(new Date(trend.value.at(-1)!.timestamp * 1000))}`;
});

async function refresh() {
  if (!configured || !rpcUrl || !vaultAddress) return;
  loading.value = true;
  error.value = "";
  try {
    const client = createPublicClient({ chain, transport: http(rpcUrl) });
    const toBlock = await client.getBlockNumber();
    const ranges: Array<{ fromBlock: bigint; toBlock: bigint }> = [];
    const blockSpan = 2_000n;
    for (let fromBlock = deploymentBlock; fromBlock <= toBlock; fromBlock += blockSpan) {
      const chunkEnd = fromBlock + blockSpan - 1n;
      ranges.push({ fromBlock, toBlock: chunkEnd < toBlock ? chunkEnd : toBlock });
    }
    const logs = (await Promise.all(ranges.map(({ fromBlock, toBlock: chunkToBlock }) =>
      client.getLogs({ address: vaultAddress, event: eventDefinition, fromBlock, toBlock: chunkToBlock })
    ))).flat();
    const blockNumbers = [...new Set(logs.map((log) => log.blockNumber))];
    const blocks = await Promise.all(blockNumbers.map((blockNumber) => client.getBlock({ blockNumber })));
    const timestamps = new Map(blocks.map((block) => [block.number, Number(block.timestamp)]));
    events.value = logs.flatMap((log) => {
      const asset = log.args.asset?.toLowerCase();
      const amount = log.args.amount;
      if (amount === undefined || !asset) return [];
      if (isBase ? asset !== zeroAddress : asset !== jpycAddress?.toLowerCase()) return [];
      return [{
        asset: isBase ? "ETH" as const : "JPYC" as const,
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
onBeforeUnmount(() => { if (refreshTimer) clearInterval(refreshTimer); });
</script>

<template>
  <section class="support-trend mainnet-trend" :aria-labelledby="titleId">
    <div class="support-trend__heading">
      <div>
        <p class="whitepaper-hero__eyebrow">{{networkLabel.toUpperCase()}}</p>
        <h2 :id="titleId">{{ networkLabel }} · {{ isBase ? "ETH" : "JPYC" }}</h2>
      </div>
      <span class="support-trend__status" :class="{ live: configured && !error }">
        {{ configured ? (loading ? (locale === "ja" ? "同期中" : "Syncing") : (locale === "ja" ? "リアルタイム" : "Live")) : (locale === "ja" ? "受付開始前" : "Not launched") }}
      </span>
    </div>

    <div class="support-trend__totals">
      <article v-if="isBase"><span>Ether</span><strong>{{ ethTotal }}</strong><small>ETH</small></article>
      <article v-else><span>JPYC</span><strong>{{ jpycTotal }}</strong><small>JPYC</small></article>
      <article><span>{{ locale === "ja" ? "支援件数" : "Contributions" }}</span><strong>{{ supportCount }}</strong><small>{{ locale === "ja" ? "件" : "events" }}</small></article>
    </div>

    <div v-if="trend.length" class="support-trend__chart">
      <svg viewBox="0 0 680 180" role="img" :aria-label="locale === 'ja' ? 'メインネットのETHとJPYC累計推移' : 'Cumulative mainnet ETH and JPYC trend'">
        <line v-for="y in [0, 45, 90, 135, 180]" :key="y" x1="0" :y1="y" x2="680" :y2="y" />
        <polyline v-if="isBase" class="eth" :points="ethLine" />
        <polyline v-else class="jpyc" :points="jpycLine" />
      </svg>
      <div class="support-trend__legend"><span :class="isBase ? 'eth' : 'jpyc'">{{isBase ? "ETH" : "JPYC"}}</span><time>{{ dateRange }}</time></div>
    </div>
    <div v-else class="support-trend__empty">
      <strong>{{ locale === "ja" ? `${networkLabel}での支援募集はまだ開始していません` : `${networkLabel} fundraising has not started` }}</strong>
      <span>{{ locale === "ja" ? "Sepoliaのテスト支援はこの集計に含まれません。本番デプロイ後、30秒ごとに時系列を更新します。" : "Sepolia test contributions are excluded. After production deployment, this timeline refreshes every 30 seconds." }}</span>
    </div>
    <p v-if="error" class="support-trend__error">{{ locale === "ja" ? "メインネット取得エラー: " : "Mainnet data error: " }}{{ error }}</p>
    <p class="support-trend__updated">
      <a :href="locale === 'ja' ? './mainnet-status' : './mainnet-status'">{{ locale === "ja" ? "本番支援状況の詳細" : "Mainnet status details" }}</a>
      · {{ lastUpdated ? `${locale === "ja" ? "最終更新" : "Last updated"}: ${lastUpdated.toLocaleTimeString()}` : (locale === "ja" ? "本番専用データのみ表示" : "Production data only") }}
    </p>
  </section>
</template>
