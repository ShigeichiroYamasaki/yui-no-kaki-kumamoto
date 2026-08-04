<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { createPublicClient, formatUnits, http, parseAbiItem, zeroAddress, type Address } from "viem";
import { base, polygon, type Chain } from "viem/chains";
import { buildSupportTrend, chartPolyline, type SupportEventPoint } from "../support-trend";

const props = defineProps<{ locale: "ja" | "en" }>();
type NetworkKey = "base" | "polygon";
type ProductionNetwork = {
  key: NetworkKey; label: string; chain: Chain; asset: "ETH" | "JPYC";
  rpcUrl?: string; vaultAddress?: Address; tokenAddress?: Address;
  deploymentBlock: bigint; deploymentBlockConfigured: boolean; decimals: number; configured: boolean;
};
type NetworkEvent = SupportEventPoint & { networkKey: NetworkKey };

const baseRpc = (import.meta.env.VITE_BASE_MAINNET_RPC_URL || import.meta.env.VITE_MAINNET_RPC_URL) as string | undefined;
const baseVault = (import.meta.env.VITE_BASE_MAINNET_VAULT_ADDRESS || import.meta.env.VITE_MAINNET_VAULT_ADDRESS) as Address | undefined;
const baseBlockValue = (import.meta.env.VITE_BASE_MAINNET_DEPLOYMENT_BLOCK || import.meta.env.VITE_MAINNET_DEPLOYMENT_BLOCK) as string | undefined;
const polygonRpc = import.meta.env.VITE_POLYGON_MAINNET_RPC_URL as string | undefined;
const polygonVault = import.meta.env.VITE_POLYGON_MAINNET_VAULT_ADDRESS as Address | undefined;
const polygonJpyc = import.meta.env.VITE_POLYGON_MAINNET_JPYC_ADDRESS as Address | undefined;
const polygonBlockValue = import.meta.env.VITE_POLYGON_MAINNET_DEPLOYMENT_BLOCK as string | undefined;

const networks: ProductionNetwork[] = [
  {
    key: "base", label: "Base Mainnet", chain: base, asset: "ETH", rpcUrl: baseRpc,
    vaultAddress: baseVault, deploymentBlock: BigInt(baseBlockValue || "0"),
    deploymentBlockConfigured: Boolean(baseBlockValue), decimals: 18,
    configured: Boolean(baseRpc && baseVault && baseBlockValue),
  },
  {
    key: "polygon", label: "Polygon PoS", chain: polygon, asset: "JPYC", rpcUrl: polygonRpc,
    vaultAddress: polygonVault, tokenAddress: polygonJpyc, deploymentBlock: BigInt(polygonBlockValue || "0"),
    deploymentBlockConfigured: Boolean(polygonBlockValue), decimals: Number(import.meta.env.VITE_POLYGON_MAINNET_JPYC_DECIMALS || "18"),
    configured: Boolean(polygonRpc && polygonVault && polygonJpyc && polygonBlockValue),
  },
];
const eventDefinition = parseAbiItem(
  "event SupportReceived(bytes32 indexed supportId, address indexed supporter, address indexed asset, uint256 amount, bytes32 countryCodeHash, bytes32 messageHash, uint256 tokenId)",
);
const loading = ref(networks.some((network) => network.configured));
const errors = ref<Record<string, string>>({});
const events = ref<NetworkEvent[]>([]);
const lastUpdated = ref<Date>();
let refreshTimer: ReturnType<typeof setInterval> | undefined;

const trend = computed(() => buildSupportTrend(events.value));
const ethLine = computed(() => chartPolyline(trend.value, "eth"));
const jpycLine = computed(() => chartPolyline(trend.value, "jpyc"));
const configuredCount = computed(() => networks.filter((network) => network.configured).length);
function networkEvents(network: ProductionNetwork) { return events.value.filter((event) => event.networkKey === network.key); }
function networkTotal(network: ProductionNetwork) {
  const total = networkEvents(network).reduce((sum, event) => sum + event.amount, 0n);
  return Number(formatUnits(total, network.decimals)).toLocaleString(undefined, { maximumFractionDigits: network.asset === "ETH" ? 6 : 2 });
}
const dateRange = computed(() => {
  if (!trend.value.length) return "—";
  const format = new Intl.DateTimeFormat(props.locale === "ja" ? "ja-JP" : "en-US", { month: "short", day: "numeric" });
  return `${format.format(new Date(trend.value[0].timestamp * 1000))} – ${format.format(new Date(trend.value.at(-1)!.timestamp * 1000))}`;
});

async function fetchNetwork(network: ProductionNetwork): Promise<NetworkEvent[]> {
  if (!network.configured || !network.rpcUrl || !network.vaultAddress || !network.deploymentBlockConfigured) return [];
  const client = createPublicClient({ chain: network.chain, transport: http(network.rpcUrl) });
  const toBlock = await client.getBlockNumber();
  const ranges: Array<{ fromBlock: bigint; toBlock: bigint }> = [];
  for (let fromBlock = network.deploymentBlock; fromBlock <= toBlock; fromBlock += 2_000n) {
    const end = fromBlock + 1_999n;
    ranges.push({ fromBlock, toBlock: end < toBlock ? end : toBlock });
  }
  const logs = (await Promise.all(ranges.map(({ fromBlock, toBlock: chunkToBlock }) =>
    client.getLogs({ address: network.vaultAddress!, event: eventDefinition, fromBlock, toBlock: chunkToBlock })
  ))).flat();
  const blockNumbers = [...new Set(logs.map((log) => log.blockNumber))];
  const blocks = await Promise.all(blockNumbers.map((blockNumber) => client.getBlock({ blockNumber })));
  const timestamps = new Map(blocks.map((block) => [block.number, Number(block.timestamp)]));
  return logs.flatMap((log): NetworkEvent[] => {
    const asset = log.args.asset?.toLowerCase();
    const amount = log.args.amount;
    if (amount === undefined || !asset) return [];
    if (network.asset === "ETH" ? asset !== zeroAddress : asset !== network.tokenAddress?.toLowerCase()) return [];
    return [{ networkKey: network.key, asset: network.asset, amount, timestamp: timestamps.get(log.blockNumber) ?? 0 }];
  });
}
async function refresh() {
  if (!configuredCount.value) return;
  loading.value = true; errors.value = {};
  const results = await Promise.all(networks.map(async (network) => {
    try { return await fetchNetwork(network); }
    catch (cause) { errors.value[network.key] = cause instanceof Error ? cause.message : String(cause); return []; }
  }));
  events.value = results.flat().sort((a, b) => a.timestamp - b.timestamp);
  lastUpdated.value = new Date(); loading.value = false;
}
onMounted(() => { void refresh(); if (configuredCount.value) refreshTimer = setInterval(() => void refresh(), 30_000); });
onBeforeUnmount(() => { if (refreshTimer) clearInterval(refreshTimer); });
</script>

<template>
  <section class="support-trend mainnet-trend" aria-labelledby="mainnet-support-title">
    <div class="support-trend__heading"><div><p class="whitepaper-hero__eyebrow">PRODUCTION / ALL CHAINS</p><h2 id="mainnet-support-title">{{locale === "ja" ? "メインネット支援状況" : "Mainnet support status"}}</h2></div><span class="support-trend__status" :class="{live: configuredCount > 0 && !Object.keys(errors).length}">{{configuredCount ? (loading ? (locale === "ja" ? "同期中" : "Syncing") : (locale === "ja" ? "リアルタイム" : "Live")) : (locale === "ja" ? "受付開始前" : "Not launched")}}</span></div>
    <div class="multichain-summary mainnet-summary">
      <div class="multichain-summary__head"><b>{{locale === "ja" ? "ネットワーク" : "Network"}}</b><b>{{locale === "ja" ? "資産" : "Asset"}}</b><b>{{locale === "ja" ? "支援総額" : "Total"}}</b><b>{{locale === "ja" ? "支援件数" : "Contributions"}}</b><b>{{locale === "ja" ? "状態" : "Status"}}</b></div>
      <div v-for="network in networks" :key="network.key" class="multichain-summary__row"><strong>{{network.label}}<small>Chain ID {{network.chain.id}}</small></strong><span><small>{{locale === "ja" ? "資産" : "Asset"}}</small>{{network.asset}}</span><span><small>{{locale === "ja" ? "支援総額" : "Total"}}</small>{{networkTotal(network)}}</span><span><small>{{locale === "ja" ? "支援件数" : "Contributions"}}</small>{{networkEvents(network).length}}</span><span><small>{{locale === "ja" ? "状態" : "Status"}}</small>{{network.configured ? (locale === "ja" ? "接続済み" : "Connected") : (locale === "ja" ? "受付開始前" : "Not launched")}}</span></div>
    </div>
    <div v-if="trend.length" class="support-trend__chart"><svg viewBox="0 0 680 180" role="img" :aria-label="locale === 'ja' ? 'Base ETHとPolygon JPYCの累計推移' : 'Cumulative Base ETH and Polygon JPYC trend'"><line v-for="y in [0,45,90,135,180]" :key="y" x1="0" :y1="y" x2="680" :y2="y"/><polyline class="eth" :points="ethLine"/><polyline class="jpyc" :points="jpycLine"/></svg><div class="support-trend__legend"><span class="eth">Base ETH</span><span class="jpyc">Polygon JPYC</span><time>{{dateRange}}</time></div></div>
    <div v-else class="support-trend__empty"><strong>{{locale === "ja" ? "メインネットでの支援募集はまだ開始していません" : "Mainnet fundraising has not started"}}</strong><span>{{locale === "ja" ? "テストネットの支援は含めません。本番デプロイ後に両chainを30秒ごとに更新します。" : "Testnet contributions are excluded. Both production chains refresh every 30 seconds after launch."}}</span></div>
    <p v-for="(message,key) in errors" :key="key" class="support-trend__error">{{key}}: {{message}}</p>
    <p class="support-trend__updated"><a href="./mainnet-status">{{locale === "ja" ? "本番支援状況の詳細" : "Mainnet status details"}}</a> · {{lastUpdated ? `${locale === "ja" ? "最終更新" : "Last updated"}: ${lastUpdated.toLocaleTimeString()}` : (locale === "ja" ? "本番専用データのみ表示" : "Production data only")}}</p>
  </section>
</template>
