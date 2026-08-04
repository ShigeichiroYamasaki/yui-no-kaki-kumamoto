<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  createPublicClient, formatUnits, http, parseAbiItem, zeroAddress,
  type Address, type Hash,
} from "viem";
import { availableDemoNetworks, type DemoNetwork } from "../testnetNetworks";
import { tamagakiGlobalId } from "../multichainIdentity";

const props = defineProps<{ locale: "ja" | "en" }>();
const supportEvent = parseAbiItem(
  "event SupportReceived(bytes32 indexed supportId, address indexed supporter, address indexed asset, uint256 amount, bytes32 countryCodeHash, bytes32 messageHash, uint256 tokenId)",
);
const transferEvent = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)");
const sbtAbi = [{
  type: "function", name: "tokenURI", stateMutability: "view",
  inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "string" }],
}] as const;

type SupportRow = {
  network: DemoNetwork;
  txHash: Hash;
  blockNumber: bigint;
  timestamp: number;
  supporter: Address;
  asset: "ETH" | "MockJPYC";
  amount: bigint;
  tokenId: bigint;
};
type SbtRow = {
  network: DemoNetwork;
  tokenId: bigint;
  owner: Address;
  txHash: Hash;
  blockNumber: bigint;
  globalId: string;
  image?: string;
};

const loading = ref(true);
const errors = ref<Record<string, string>>({});
const supports = ref<SupportRow[]>([]);
const sbts = ref<SbtRow[]>([]);
const lastUpdated = ref<Date>();

const networks = computed(() => availableDemoNetworks);
const totalSupportCount = computed(() => supports.value.length);
const totalSbtCount = computed(() => sbts.value.length);
const totalWalletCount = computed(() => new Set(supports.value.map((row) => row.supporter.toLowerCase())).size);

function supportsFor(network: DemoNetwork) {
  return supports.value.filter((row) => row.network.key === network.key);
}
function sbtsFor(network: DemoNetwork) {
  return sbts.value.filter((row) => row.network.key === network.key);
}
function totalFor(network: DemoNetwork, asset: SupportRow["asset"]) {
  return supportsFor(network).filter((row) => row.asset === asset).reduce((sum, row) => sum + row.amount, 0n);
}
function formattedTotal(network: DemoNetwork, asset: SupportRow["asset"]) {
  const decimals = asset === "ETH" ? 18 : network.jpycDecimals;
  return Number(formatUnits(totalFor(network, asset), decimals)).toLocaleString(undefined, {
    maximumFractionDigits: asset === "ETH" ? 6 : 2,
  });
}
function short(value: string) { return `${value.slice(0, 8)}…${value.slice(-6)}`; }
function amount(row: SupportRow) {
  const decimals = row.asset === "ETH" ? 18 : row.network.jpycDecimals;
  return Number(formatUnits(row.amount, decimals)).toLocaleString(undefined, {
    maximumFractionDigits: row.asset === "ETH" ? 6 : 2,
  });
}
function date(timestamp: number) {
  return new Intl.DateTimeFormat(props.locale === "ja" ? "ja-JP" : "en-US", {
    dateStyle: "medium", timeStyle: "short",
  }).format(new Date(timestamp * 1000));
}
function explorer(network: DemoNetwork, kind: "address" | "tx" | "token", value: string, tokenId?: bigint) {
  if (kind === "token") return `${network.explorerUrl}/token/${value}?a=${tokenId}`;
  return `${network.explorerUrl}/${kind}/${value}`;
}
function addresses(network: DemoNetwork) {
  return [
    ["RecoverySupportVault", network.vaultAddress],
    ["TamagakiSBT", network.sbtAddress],
    ["MockJPYC", network.jpycAddress],
    ["RecoveryAttestationRegistry", network.registryAddress],
    ["RecoverySupportCouncil", network.councilAddress],
  ] as const;
}

async function fetchNetwork(network: DemoNetwork) {
  const client = createPublicClient({ chain: network.chain, transport: http(network.rpcUrl) });
  const toBlock = await client.getBlockNumber();
  const ranges: Array<{ fromBlock: bigint; toBlock: bigint }> = [];
  const blockSpan = 2_000n;
  for (let fromBlock = network.deploymentBlock; fromBlock <= toBlock; fromBlock += blockSpan) {
    const chunkEnd = fromBlock + blockSpan - 1n;
    ranges.push({ fromBlock, toBlock: chunkEnd < toBlock ? chunkEnd : toBlock });
  }
  const chunks = await Promise.all(ranges.map(async ({ fromBlock, toBlock: chunkToBlock }) => {
    const [support, mint] = await Promise.all([
      client.getLogs({ address: network.vaultAddress, event: supportEvent, fromBlock, toBlock: chunkToBlock }),
      client.getLogs({
        address: network.sbtAddress, event: transferEvent, args: { from: zeroAddress },
        fromBlock, toBlock: chunkToBlock,
      }),
    ]);
    return { support, mint };
  }));
  const supportLogs = chunks.flatMap((chunk) => chunk.support);
  const mintLogs = chunks.flatMap((chunk) => chunk.mint);
  const blockNumbers = [...new Set(supportLogs.map((log) => log.blockNumber))];
  const blocks = await Promise.all(blockNumbers.map((blockNumber) => client.getBlock({ blockNumber })));
  const timestamps = new Map(blocks.map((block) => [block.number, Number(block.timestamp)]));

  const networkSupports = supportLogs.flatMap((log): SupportRow[] => {
    const { supporter, asset, amount: value, tokenId } = log.args;
    if (!supporter || !asset || value === undefined || tokenId === undefined || !log.transactionHash) return [];
    const normalized = asset.toLowerCase();
    if (normalized !== zeroAddress && normalized !== network.jpycAddress.toLowerCase()) return [];
    return [{
      network, txHash: log.transactionHash, blockNumber: log.blockNumber,
      timestamp: timestamps.get(log.blockNumber) ?? 0, supporter,
      asset: normalized === zeroAddress ? "ETH" : "MockJPYC", amount: value, tokenId,
    }];
  });
  const minted = mintLogs.flatMap((log): SbtRow[] => {
    const { to, tokenId } = log.args;
    if (!to || tokenId === undefined || !log.transactionHash) return [];
    return [{
      network, tokenId, owner: to, txHash: log.transactionHash, blockNumber: log.blockNumber,
      globalId: tamagakiGlobalId(network.chain.id, network.sbtAddress, tokenId),
    }];
  });
  const networkSbts = await Promise.all(minted.map(async (sbt) => {
    try {
      const uri = await client.readContract({
        address: network.sbtAddress, abi: sbtAbi, functionName: "tokenURI", args: [sbt.tokenId],
      });
      if (!uri.startsWith("data:application/json;base64,")) return sbt;
      const json = JSON.parse(atob(uri.slice(uri.indexOf(",") + 1))) as { image?: string };
      return { ...sbt, image: json.image };
    } catch { return sbt; }
  }));
  return { supports: networkSupports, sbts: networkSbts };
}

async function refresh() {
  loading.value = true;
  errors.value = {};
  const results = await Promise.all(networks.value.map(async (network) => {
    try { return { network, ...(await fetchNetwork(network)) }; }
    catch (cause) {
      errors.value[network.key] = cause instanceof Error ? cause.message : String(cause);
      return { network, supports: [] as SupportRow[], sbts: [] as SbtRow[] };
    }
  }));
  supports.value = results.flatMap((result) => result.supports).sort((a, b) => b.timestamp - a.timestamp);
  sbts.value = results.flatMap((result) => result.sbts).sort((a, b) => Number(b.blockNumber - a.blockNumber));
  lastUpdated.value = new Date();
  loading.value = false;
}

onMounted(() => void refresh());
</script>

<template>
  <div class="demo-status demo-status--combined">
    <div class="demo-warning"><b>MULTICHAIN TESTNET</b>{{ locale === "ja" ? "表示されるETH・MockJPYC・SBTに実資産としての価値はありません。" : "The displayed ETH, MockJPYC, and SBTs have no real-world asset value." }}</div>

    <section class="demo-status__section">
      <div class="demo-status__heading">
        <div><p class="whitepaper-hero__eyebrow">ALL TESTNETS</p><h2>{{ locale === "ja" ? "支援金の集計" : "Contribution totals" }}</h2></div>
        <button type="button" :disabled="loading" @click="refresh">{{ loading ? (locale === "ja" ? "同期中…" : "Syncing…") : (locale === "ja" ? "更新" : "Refresh") }}</button>
      </div>
      <div class="multichain-summary" role="table" :aria-label="locale === 'ja' ? 'チェーン別支援集計' : 'Totals by chain'">
        <div class="multichain-summary__head" role="row"><b>{{locale === "ja" ? "ネットワーク" : "Network"}}</b><b>ETH</b><b>MockJPYC</b><b>{{locale === "ja" ? "支援" : "Contributions"}}</b><b>SBT</b></div>
        <div v-for="network in networks" :key="network.key" class="multichain-summary__row" role="row">
          <strong>{{network.label}}<small>Chain ID {{network.chain.id}}</small></strong>
          <span><small>ETH</small>{{formattedTotal(network, "ETH")}}</span><span><small>MockJPYC</small>{{formattedTotal(network, "MockJPYC")}}</span>
          <span><small>{{locale === "ja" ? "支援" : "Contributions"}}</small>{{supportsFor(network).length}}</span><span><small>SBT</small>{{sbtsFor(network).length}}</span>
        </div>
      </div>
      <div class="demo-status__totals demo-status__totals--overall">
        <article><span>{{locale === "ja" ? "全支援件数" : "All contributions"}}</span><strong>{{totalSupportCount}}</strong></article>
        <article><span>{{locale === "ja" ? "支援ウォレット" : "Support wallets"}}</span><strong>{{totalWalletCount}}</strong></article>
        <article><span>{{locale === "ja" ? "全チェーンSBT" : "All-chain SBTs"}}</span><strong>{{totalSbtCount}}</strong></article>
      </div>
      <p v-for="(message, key) in errors" :key="key" class="support-trend__error">{{key}}: {{message}}</p>
      <p class="demo-status__note">{{lastUpdated ? `${locale === "ja" ? "最終更新" : "Last updated"}: ${lastUpdated.toLocaleString()}` : "SupportReceived / Transfer events"}}</p>
    </section>

    <section class="demo-status__section">
      <p class="whitepaper-hero__eyebrow">TAMAGAKI SBT / ALL CHAINS</p>
      <h2>{{locale === "ja" ? "取得された玉垣SBT" : "Issued Tamagaki SBTs"}}</h2>
      <div v-if="sbts.length" class="tamagaki-grid">
        <a v-for="sbt in sbts" :key="sbt.globalId" :href="explorer(sbt.network, 'token', sbt.network.sbtAddress, sbt.tokenId)" target="_blank" rel="noreferrer">
          <img v-if="sbt.image" :src="sbt.image" :alt="`Tamagaki SBT #${sbt.tokenId}`">
          <span class="tamagaki-grid__chain">{{sbt.network.label}}</span>
          <span class="tamagaki-grid__number">玉垣 {{sbt.tokenId.toString().padStart(3, "0")}}</span>
          <strong>SBT #{{sbt.tokenId}}</strong><small>{{locale === "ja" ? "所有者" : "Owner"}} {{short(sbt.owner)}}</small>
          <code>{{sbt.globalId}}</code>
        </a>
      </div>
      <div v-else-if="!loading" class="support-trend__empty">{{locale === "ja" ? "発行済みSBTはまだありません。" : "No SBTs have been issued yet."}}</div>
    </section>

    <section class="demo-status__section">
      <p class="whitepaper-hero__eyebrow">SUPPORT EVENTS / ALL CHAINS</p><h2>{{locale === "ja" ? "支援履歴" : "Contribution history"}}</h2>
      <div class="demo-status__table-wrap"><table><thead><tr><th>{{locale === "ja" ? "日時" : "Date"}}</th><th>Chain</th><th>{{locale === "ja" ? "支援者" : "Supporter"}}</th><th>{{locale === "ja" ? "金額" : "Amount"}}</th><th>SBT</th><th>Tx</th></tr></thead><tbody>
        <tr v-for="row in supports" :key="`${row.network.key}:${row.txHash}`"><td>{{date(row.timestamp)}}</td><td>{{row.network.label}}</td><td><a :href="explorer(row.network, 'address', row.supporter)" target="_blank" rel="noreferrer"><code>{{short(row.supporter)}}</code></a></td><td><strong>{{amount(row)}}</strong> {{row.asset}}</td><td><a :href="explorer(row.network, 'token', row.network.sbtAddress, row.tokenId)" target="_blank" rel="noreferrer">#{{row.tokenId}}</a></td><td><a :href="explorer(row.network, 'tx', row.txHash)" target="_blank" rel="noreferrer">{{short(row.txHash)}} ↗</a></td></tr>
      </tbody></table></div>
    </section>

    <section class="demo-status__section">
      <p class="whitepaper-hero__eyebrow">DEPLOYED CONTRACTS</p><h2>{{locale === "ja" ? "チェーン別コントラクト" : "Contracts by chain"}}</h2>
      <details v-for="network in networks" :key="network.key" class="contract-details"><summary>{{network.label}} · Chain ID {{network.chain.id}}</summary><div class="contract-addresses"><a v-for="([name, address]) in addresses(network)" :key="name" :href="explorer(network, 'address', address)" target="_blank" rel="noreferrer"><span>{{name}}</span><code>{{address}}</code><b>↗</b></a></div><p class="demo-status__note">{{locale === "ja" ? "集計開始ブロック" : "Aggregation starts at block"}}: {{network.deploymentBlock}}</p></details>
    </section>
  </div>
</template>
