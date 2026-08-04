<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  createPublicClient,
  formatUnits,
  http,
  parseAbiItem,
  zeroAddress,
  type Address,
  type Hash,
} from "viem";
import { availableDemoNetworks, demoNetworks, type DemoNetworkKey } from "../testnetNetworks";
import { tamagakiGlobalId } from "../multichainIdentity";

const props = defineProps<{ locale: "ja" | "en" }>();
const preferredNetwork = import.meta.env.VITE_RECOVERY_DEFAULT_NETWORK as DemoNetworkKey | undefined;
const networkKey = ref<DemoNetworkKey>(preferredNetwork && demoNetworks[preferredNetwork]?.configured ? preferredNetwork : "sepolia");
const network = computed(() => demoNetworks[networkKey.value]);
const addresses = computed(() => [
  ["RecoverySupportVault", network.value.vaultAddress],
  ["TamagakiSBT", network.value.sbtAddress],
  ["MockJPYC", network.value.jpycAddress],
  ["RecoveryAttestationRegistry", network.value.registryAddress],
  ["RecoverySupportCouncil", network.value.councilAddress],
] as const);

const supportEvent = parseAbiItem(
  "event SupportReceived(bytes32 indexed supportId, address indexed supporter, address indexed asset, uint256 amount, bytes32 countryCodeHash, bytes32 messageHash, uint256 tokenId)",
);
const transferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
);
const sbtAbi = [{
  type: "function", name: "tokenURI", stateMutability: "view",
  inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "string" }],
}] as const;

type SupportRow = {
  txHash: Hash;
  blockNumber: bigint;
  timestamp: number;
  supporter: Address;
  asset: "ETH" | "MockJPYC";
  amount: bigint;
  tokenId: bigint;
};
type SbtRow = { tokenId: bigint; owner: Address; txHash: Hash; blockNumber: bigint; globalId: string; image?: string };

const loading = ref(true);
const error = ref("");
const supports = ref<SupportRow[]>([]);
const sbts = ref<SbtRow[]>([]);
const lastUpdated = ref<Date>();

const ethTotal = computed(() => supports.value
  .filter((row) => row.asset === "ETH")
  .reduce((sum, row) => sum + row.amount, 0n));
const jpycTotal = computed(() => supports.value
  .filter((row) => row.asset === "MockJPYC")
  .reduce((sum, row) => sum + row.amount, 0n));
const supporterCount = computed(() => new Set(supports.value.map((row) => row.supporter.toLowerCase())).size);

function short(value: string) {
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}
function selectNetwork(key: DemoNetworkKey) {
  if (networkKey.value === key) return;
  networkKey.value = key;
  void refresh();
}
function amount(row: SupportRow) {
  const decimals = row.asset === "ETH" ? 18 : network.value.jpycDecimals;
  return Number(formatUnits(row.amount, decimals)).toLocaleString(undefined, {
    maximumFractionDigits: row.asset === "ETH" ? 6 : 2,
  });
}
function date(timestamp: number) {
  return new Intl.DateTimeFormat(props.locale === "ja" ? "ja-JP" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp * 1000));
}
const explorer = (kind: "address" | "tx" | "token", value: string, tokenId?: bigint) => {
  if (kind === "token") return `${network.value.explorerUrl}/token/${value}?a=${tokenId}`;
  return `${network.value.explorerUrl}/${kind}/${value}`;
};

async function refresh() {
  loading.value = true;
  error.value = "";
  supports.value = [];
  sbts.value = [];
  try {
    const selected = network.value;
    const client = createPublicClient({ chain: selected.chain, transport: http(selected.rpcUrl) });
    const toBlock = await client.getBlockNumber();
    const [supportLogs, mintLogs] = await Promise.all([
      client.getLogs({ address: selected.vaultAddress, event: supportEvent, fromBlock: selected.deploymentBlock, toBlock }),
      client.getLogs({
        address: selected.sbtAddress,
        event: transferEvent,
        args: { from: zeroAddress },
        fromBlock: selected.deploymentBlock,
        toBlock,
      }),
    ]);
    const blockNumbers = [...new Set(supportLogs.map((log) => log.blockNumber))];
    const blocks = await Promise.all(blockNumbers.map((blockNumber) => client.getBlock({ blockNumber })));
    const timestamps = new Map(blocks.map((block) => [block.number, Number(block.timestamp)]));

    supports.value = supportLogs.flatMap((log) => {
      const { supporter, asset, amount: value, tokenId } = log.args;
      if (!supporter || !asset || value === undefined || tokenId === undefined || !log.transactionHash) return [];
      const normalized = asset.toLowerCase();
      if (normalized !== zeroAddress && normalized !== selected.jpycAddress.toLowerCase()) return [];
      return [{
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        timestamp: timestamps.get(log.blockNumber) ?? 0,
        supporter,
        asset: normalized === zeroAddress ? "ETH" as const : "MockJPYC" as const,
        amount: value,
        tokenId,
      }];
    }).sort((a, b) => Number(b.blockNumber - a.blockNumber));

    const minted = mintLogs.flatMap((log) => {
      const { to, tokenId } = log.args;
      if (!to || tokenId === undefined || !log.transactionHash) return [];
      return [{
        tokenId,
        owner: to,
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        globalId: tamagakiGlobalId(selected.chain.id, selected.sbtAddress, tokenId),
      }];
    }).sort((a, b) => Number(b.tokenId - a.tokenId));
    sbts.value = await Promise.all(minted.map(async (sbt) => {
      try {
        const uri = await client.readContract({ address: selected.sbtAddress, abi: sbtAbi, functionName: "tokenURI", args: [sbt.tokenId] });
        if (!uri.startsWith("data:application/json;base64,")) return sbt;
        const json = JSON.parse(atob(uri.slice(uri.indexOf(",") + 1))) as { image?: string };
        return { ...sbt, image: json.image };
      } catch { return sbt; }
    }));
    lastUpdated.value = new Date();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    loading.value = false;
  }
}

onMounted(() => void refresh());
</script>

<template>
  <div class="demo-status">
    <nav v-if="availableDemoNetworks.length > 1" class="testnet-switcher" :aria-label="locale === 'ja' ? '表示するテストネット' : 'Test network to display'">
      <div class="testnet-switcher__intro">
        <b>{{ locale === "ja" ? "表示するテストネットを選択" : "Choose a test network" }}</b>
        <span>{{ locale === "ja" ? "ネットワークごとに支援額とSBTを個別表示します" : "Contributions and SBTs are shown separately for each network" }}</span>
      </div>
      <div class="testnet-switcher__options">
        <button
          v-for="item in availableDemoNetworks"
          :key="item.key"
          type="button"
          :class="{ 'is-active': networkKey === item.key }"
          :aria-pressed="networkKey === item.key"
          @click="selectNetwork(item.key)"
        >
          <span>{{ item.label }}</span>
          <small>Chain ID {{ item.chain.id }}</small>
          <b>{{ networkKey === item.key ? (locale === "ja" ? "表示中" : "Selected") : (locale === "ja" ? "表示する" : "View") }}</b>
        </button>
      </div>
    </nav>
    <div class="demo-warning">
      <b>{{network.label.toUpperCase()}} TESTNET</b>
      {{ locale === "ja" ? "表示されるETH・MockJPYC・SBTに実資産としての価値はありません。" : "The displayed ETH, MockJPYC, and SBTs have no real-world asset value." }}
    </div>

    <section class="demo-status__section">
      <div class="demo-status__heading">
        <div><p class="whitepaper-hero__eyebrow">DEPLOYED CONTRACTS</p><h2>{{ locale === "ja" ? "コントラクトアドレス" : "Contract addresses" }}</h2></div>
        <span class="demo-status__network">{{network.label}} · {{network.chain.id}}</span>
      </div>
      <div class="contract-addresses">
        <a v-for="([name, address]) in addresses" :key="name" :href="explorer('address', address)" target="_blank" rel="noreferrer">
          <span>{{ name }}</span><code>{{ address }}</code><b>↗</b>
        </a>
      </div>
      <p class="demo-status__note">{{ locale === "ja" ? `集計開始ブロック: ${network.deploymentBlock}` : `Aggregation starts at block ${network.deploymentBlock}` }}</p>
    </section>

    <section class="demo-status__section">
      <div class="demo-status__heading">
        <div><p class="whitepaper-hero__eyebrow">LIVE ON-CHAIN DATA</p><h2>{{ locale === "ja" ? "支援金の集計" : "Contribution totals" }}</h2></div>
        <button type="button" :disabled="loading" @click="refresh">{{ loading ? (locale === "ja" ? "同期中…" : "Syncing…") : (locale === "ja" ? "更新" : "Refresh") }}</button>
      </div>
      <div class="demo-status__totals">
        <article><span>ETH</span><strong>{{ Number(formatUnits(ethTotal, 18)).toLocaleString(undefined, { maximumFractionDigits: 6 }) }}</strong></article>
        <article><span>MockJPYC</span><strong>{{ Number(formatUnits(jpycTotal, network.jpycDecimals)).toLocaleString(undefined, { maximumFractionDigits: 2 }) }}</strong></article>
        <article><span>{{ locale === "ja" ? "支援件数" : "Contributions" }}</span><strong>{{ supports.length }}</strong></article>
        <article><span>{{ locale === "ja" ? "支援ウォレット" : "Support wallets" }}</span><strong>{{ supporterCount }}</strong></article>
        <article><span>{{ locale === "ja" ? "発行SBT" : "SBTs issued" }}</span><strong>{{ sbts.length }}</strong></article>
      </div>
      <p v-if="error" class="support-trend__error">{{ error }}</p>
      <p class="demo-status__note">{{ lastUpdated ? `${locale === "ja" ? "最終更新" : "Last updated"}: ${lastUpdated.toLocaleString()}` : "SupportReceived / Transfer events" }}</p>
    </section>

    <section class="demo-status__section">
      <p class="whitepaper-hero__eyebrow">TAMAGAKI SBT</p>
      <h2>{{ locale === "ja" ? "取得されたSBT" : "Issued SBTs" }}</h2>
      <div v-if="sbts.length" class="tamagaki-grid">
        <a v-for="sbt in sbts" :key="sbt.globalId" :href="explorer('token', network.sbtAddress, sbt.tokenId)" target="_blank" rel="noreferrer">
          <img v-if="sbt.image" :src="sbt.image" :alt="`Tamagaki SBT #${sbt.tokenId}`">
          <span class="tamagaki-grid__number">玉垣 {{ sbt.tokenId.toString().padStart(3, "0") }}</span>
          <strong>SBT #{{ sbt.tokenId }}</strong>
          <small>{{ locale === "ja" ? "所有者" : "Owner" }} {{ short(sbt.owner) }}</small>
        </a>
      </div>
      <div v-else-if="!loading" class="support-trend__empty">{{ locale === "ja" ? "発行済みSBTはまだありません。" : "No SBTs have been issued yet." }}</div>
    </section>

    <section class="demo-status__section">
      <p class="whitepaper-hero__eyebrow">SUPPORT EVENTS</p>
      <h2>{{ locale === "ja" ? "支援履歴" : "Contribution history" }}</h2>
      <div class="demo-status__table-wrap">
        <table>
          <thead><tr><th>{{ locale === "ja" ? "日時" : "Date" }}</th><th>{{ locale === "ja" ? "支援者" : "Supporter" }}</th><th>{{ locale === "ja" ? "金額" : "Amount" }}</th><th>SBT</th><th>Tx</th></tr></thead>
          <tbody>
            <tr v-for="row in supports" :key="row.txHash">
              <td>{{ date(row.timestamp) }}</td>
              <td><a :href="explorer('address', row.supporter)" target="_blank" rel="noreferrer"><code>{{ short(row.supporter) }}</code></a></td>
              <td><strong>{{ amount(row) }}</strong> {{ row.asset }}</td>
              <td><a v-if="row.tokenId" :href="explorer('token', network.sbtAddress, row.tokenId)" target="_blank" rel="noreferrer">#{{ row.tokenId }}</a><span v-else>—</span></td>
              <td><a :href="explorer('tx', row.txHash)" target="_blank" rel="noreferrer">{{ short(row.txHash) }} ↗</a></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!supports.length && !loading" class="support-trend__empty">{{ locale === "ja" ? "支援イベントはまだありません。デモページから最初の支援を送信できます。" : "No contribution events yet. Submit the first test contribution from the demo page." }}</div>
    </section>
  </div>
</template>
