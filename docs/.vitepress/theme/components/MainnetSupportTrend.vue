<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { createPublicClient, formatUnits, http, parseAbiItem, zeroAddress, type Address, type Hash } from "viem";
import { base, polygon, type Chain } from "viem/chains";
import { buildSupportTrend, chartPolyline, type SupportEventPoint } from "../support-trend";

const props = defineProps<{ locale: "ja" | "en" }>();
type NetworkKey = "base" | "polygon";
type ProductionNetwork = {
  key: NetworkKey; label: string; chain: Chain; asset: "ETH" | "JPYC";
  rpcUrl?: string; vaultAddress?: Address; tokenAddress?: Address; sbtAddress?: Address; explorerUrl: string;
  deploymentBlock: bigint; deploymentBlockConfigured: boolean; decimals: number; configured: boolean;
};
type NetworkEvent = SupportEventPoint & { networkKey: NetworkKey; supporter: Address; tokenId: bigint; txHash: Hash };
type MainnetSbt = { network: ProductionNetwork; tokenId: bigint; owner: Address; globalId: string; image?: string; displayName?: string };

const baseRpc = (import.meta.env.VITE_BASE_MAINNET_RPC_URL || import.meta.env.VITE_MAINNET_RPC_URL) as string | undefined;
const baseVault = (import.meta.env.VITE_BASE_MAINNET_VAULT_ADDRESS || import.meta.env.VITE_MAINNET_VAULT_ADDRESS) as Address | undefined;
const baseSbt = import.meta.env.VITE_BASE_MAINNET_TAMAGAKI_SBT_ADDRESS as Address | undefined;
const baseBlockValue = (import.meta.env.VITE_BASE_MAINNET_DEPLOYMENT_BLOCK || import.meta.env.VITE_MAINNET_DEPLOYMENT_BLOCK) as string | undefined;
const polygonRpc = import.meta.env.VITE_POLYGON_MAINNET_RPC_URL as string | undefined;
const polygonVault = import.meta.env.VITE_POLYGON_MAINNET_VAULT_ADDRESS as Address | undefined;
const polygonJpyc = import.meta.env.VITE_POLYGON_MAINNET_JPYC_ADDRESS as Address | undefined;
const polygonSbt = import.meta.env.VITE_POLYGON_MAINNET_TAMAGAKI_SBT_ADDRESS as Address | undefined;
const polygonBlockValue = import.meta.env.VITE_POLYGON_MAINNET_DEPLOYMENT_BLOCK as string | undefined;

const networks: ProductionNetwork[] = [
  {
    key: "base", label: "Base Mainnet", chain: base, asset: "ETH", rpcUrl: baseRpc,
    vaultAddress: baseVault, sbtAddress: baseSbt, explorerUrl: "https://basescan.org", deploymentBlock: BigInt(baseBlockValue || "0"),
    deploymentBlockConfigured: Boolean(baseBlockValue), decimals: 18,
    configured: Boolean(baseRpc && baseVault && baseBlockValue),
  },
  {
    key: "polygon", label: "Polygon PoS", chain: polygon, asset: "JPYC", rpcUrl: polygonRpc,
    vaultAddress: polygonVault, tokenAddress: polygonJpyc, sbtAddress: polygonSbt, explorerUrl: "https://polygonscan.com", deploymentBlock: BigInt(polygonBlockValue || "0"),
    deploymentBlockConfigured: Boolean(polygonBlockValue), decimals: Number(import.meta.env.VITE_POLYGON_MAINNET_JPYC_DECIMALS || "18"),
    configured: Boolean(polygonRpc && polygonVault && polygonJpyc && polygonBlockValue),
  },
];
const eventDefinition = parseAbiItem(
  "event SupportReceived(bytes32 indexed supportId, address indexed supporter, address indexed asset, uint256 amount, bytes32 countryCodeHash, bytes32 messageHash, uint256 tokenId)",
);
const sbtAbi = [{ type: "function", name: "tokenURI", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "string" }] }, { type: "function", name: "artwork", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [{ name: "displayName", type: "string" }, { name: "dedicationMessage", type: "string" }, { name: "assetLabel", type: "string" }, { name: "amount", type: "uint256" }, { name: "assetDecimals", type: "uint8" }, { name: "showAmount", type: "bool" }] }] }] as const;
const loading = ref(networks.some((network) => network.configured));
const errors = ref<Record<string, string>>({});
const events = ref<NetworkEvent[]>([]);
const sbts = ref<MainnetSbt[]>([]);
const lastUpdated = ref<Date>();
let refreshTimer: ReturnType<typeof setInterval> | undefined;

const trend = computed(() => buildSupportTrend(events.value));
const ethLine = computed(() => chartPolyline(trend.value, "eth"));
const jpycLine = computed(() => chartPolyline(trend.value, "jpyc"));
const configuredCount = computed(() => networks.filter((network) => network.configured).length);
const overviewSbts = computed(() => sbts.value.length <= 400 ? sbts.value : Array.from({ length: 400 }, (_, index) => sbts.value[Math.floor(index * sbts.value.length / 400)]));
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

async function fetchNetwork(network: ProductionNetwork): Promise<{ events: NetworkEvent[]; sbts: MainnetSbt[] }> {
  if (!network.configured || !network.rpcUrl || !network.vaultAddress || !network.deploymentBlockConfigured) return { events: [], sbts: [] };
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
  const networkEvents = logs.flatMap((log): NetworkEvent[] => {
    const asset = log.args.asset?.toLowerCase();
    const amount = log.args.amount;
    const supporter = log.args.supporter;
    const tokenId = log.args.tokenId;
    if (amount === undefined || !asset || !supporter || tokenId === undefined || !log.transactionHash) return [];
    if (network.asset === "ETH" ? asset !== zeroAddress : asset !== network.tokenAddress?.toLowerCase()) return [];
    return [{ networkKey: network.key, asset: network.asset, amount, timestamp: timestamps.get(log.blockNumber) ?? 0, supporter, tokenId, txHash: log.transactionHash }];
  });
  const networkSbts = network.sbtAddress ? await Promise.all(networkEvents.map(async (event): Promise<MainnetSbt> => {
    const baseSbtRow: MainnetSbt = { network, tokenId: event.tokenId, owner: event.supporter, globalId: `${network.chain.id}:${network.sbtAddress!.toLowerCase()}:${event.tokenId}` };
    try {
      const [uri, artwork] = await Promise.all([
        client.readContract({ address: network.sbtAddress!, abi: sbtAbi, functionName: "tokenURI", args: [event.tokenId] }),
        client.readContract({ address: network.sbtAddress!, abi: sbtAbi, functionName: "artwork", args: [event.tokenId] }),
      ]);
      const metadata = uri.startsWith("data:application/json;base64,") ? JSON.parse(atob(uri.slice(uri.indexOf(",") + 1))) as { image?: string } : {};
      return { ...baseSbtRow, displayName: artwork.displayName, image: metadata.image };
    } catch { return baseSbtRow; }
  })) : [];
  return { events: networkEvents, sbts: networkSbts };
}
async function refresh() {
  if (!configuredCount.value) return;
  loading.value = true; errors.value = {};
  const results = await Promise.all(networks.map(async (network) => {
    try { return await fetchNetwork(network); }
    catch (cause) { errors.value[network.key] = cause instanceof Error ? cause.message : String(cause); return { events: [], sbts: [] }; }
  }));
  events.value = results.flatMap((result) => result.events).sort((a, b) => a.timestamp - b.timestamp);
  sbts.value = results.flatMap((result) => result.sbts).sort((a, b) => Number(b.tokenId - a.tokenId));
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
    <section class="mainnet-tamagaki">
      <div class="tamagaki-explorer__heading"><div><p class="whitepaper-hero__eyebrow">MAINNET TAMAGAKI / ALL CHAINS</p><h2>{{locale === "ja" ? "熊本城を囲む本番玉垣SBT" : "Mainnet Tamagaki around Kumamoto Castle"}}</h2><p>{{locale === "ja" ? "BaseとPolygonで発行された玉垣を一つの垣根として表示します。" : "Tamagaki issued on Base and Polygon form one shared fence."}}</p></div><strong>{{sbts.length.toLocaleString()}}<small>{{locale === "ja" ? "本" : " Tamagaki"}}</small></strong></div>
      <div v-if="sbts.length" class="tamagaki-overview mainnet-tamagaki__overview"><div class="tamagaki-overview__castle" aria-hidden="true"><span>熊本城</span><small>KUMAMOTO CASTLE</small></div><div class="tamagaki-overview__fence"><a v-for="sbt in overviewSbts" :key="sbt.globalId" class="tamagaki-overview__stake" :title="sbt.displayName || `SBT #${sbt.tokenId}`" :href="`${sbt.network.explorerUrl}/token/${sbt.network.sbtAddress}?a=${sbt.tokenId}`" target="_blank" rel="noreferrer"><span></span></a></div></div>
      <div v-else class="support-trend__empty"><strong>{{locale === "ja" ? "本番玉垣SBTはまだ発行されていません" : "No mainnet Tamagaki have been issued"}}</strong><span>{{locale === "ja" ? "本番SBTアドレスの設定後、BaseとPolygonを統合して表示します。" : "After production SBT addresses are configured, Base and Polygon appear together."}}</span></div>
    </section>
    <p v-for="(message,key) in errors" :key="key" class="support-trend__error">{{key}}: {{message}}</p>
    <p class="support-trend__updated"><a href="./mainnet-status">{{locale === "ja" ? "本番支援状況の詳細" : "Mainnet status details"}}</a> · {{lastUpdated ? `${locale === "ja" ? "最終更新" : "Last updated"}: ${lastUpdated.toLocaleTimeString()}` : (locale === "ja" ? "本番専用データのみ表示" : "Production data only")}}</p>
  </section>
</template>
