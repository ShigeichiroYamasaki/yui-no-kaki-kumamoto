<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import {
  createPublicClient, fallback, formatUnits, http, parseAbiItem, zeroAddress,
  type Address, type EIP1193Provider, type Hash,
} from "viem";
import { availableDemoNetworks, demoNetworks, type DemoNetwork } from "../testnetNetworks";
import { tamagakiGlobalId } from "../multichainIdentity";

const props = defineProps<{ locale: "ja" | "en" }>();
const supportEvent = parseAbiItem(
  "event SupportReceived(bytes32 indexed supportId, address indexed supporter, address indexed asset, uint256 amount, bytes32 countryCodeHash, bytes32 messageHash, uint256 tokenId)",
);
const transferEvent = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)");
const bitcoinAttestedEvent = parseAbiItem("event SupportAttested(bytes32 indexed intentHash, uint8 indexed route, bytes32 indexed sourceId, uint32 sourceIndex, uint256 amount, address recipient, uint64 observedAt, uint64 confirmationReference, uint64 verifierEpoch)");
const bitcoinIssuedEvent = parseAbiItem("event BitcoinTamagakiIssued(bytes32 indexed intentHash, uint256 indexed tokenId, address indexed recipient)");
const bitcoinInvalidatedEvent = parseAbiItem("event SupportInvalidated(bytes32 indexed intentHash, uint256 indexed tokenId, bytes32 reasonHash)");
const sbtAbi = [{
  type: "function", name: "tokenURI", stateMutability: "view",
  inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "string" }],
}, {
  type: "function", name: "artwork", stateMutability: "view",
  inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{
    name: "", type: "tuple", components: [
      { name: "displayName", type: "string" }, { name: "dedicationMessage", type: "string" },
      { name: "assetLabel", type: "string" }, { name: "amount", type: "uint256" },
      { name: "assetDecimals", type: "uint8" }, { name: "showAmount", type: "bool" },
    ],
  }],
}] as const;

type SupportRow = {
  network: DemoNetwork;
  txHash: Hash;
  blockNumber: bigint;
  timestamp: number;
  supporter: Address;
  asset: "ETH" | "MockJPYC" | "BTC";
  amount: bigint;
  decimals?: number;
  route?: "Native Bitcoin" | "Lightning";
  tokenId: bigint;
  sbtAddress: Address;
};
type SbtRow = {
  network: DemoNetwork;
  tokenId: bigint;
  owner: Address;
  txHash: Hash;
  blockNumber: bigint;
  globalId: string;
  sbtAddress: Address;
  route?: "Native Bitcoin" | "Lightning";
  image?: string;
  displayName?: string;
  dedicationMessage?: string;
};

const loading = ref(true);
const errors = ref<Record<string, string>>({});
const supports = ref<SupportRow[]>([]);
const sbts = ref<SbtRow[]>([]);
const lastUpdated = ref<Date>();
const search = ref("");
const selectedDistrict = ref(0);
const connectedAccount = ref<Address>();
const onlyMine = ref(false);
const copiedId = ref("");
const districtSize = 100;

const networks = computed(() => availableDemoNetworks);
const totalSupportCount = computed(() => supports.value.length);
const totalSbtCount = computed(() => sbts.value.length);
const totalWalletCount = computed(() => new Set(supports.value.map((row) => row.supporter.toLowerCase())).size);
const districtCount = computed(() => Math.max(1, Math.ceil(sbts.value.length / districtSize)));
const matchingSbts = computed(() => {
  const query = search.value.trim().toLowerCase();
  return sbts.value.filter((sbt) => {
    if (onlyMine.value && sbt.owner.toLowerCase() !== connectedAccount.value?.toLowerCase()) return false;
    if (!query) return true;
    return [sbt.displayName, sbt.owner, sbt.globalId, sbt.tokenId.toString(), sbt.network.label]
      .some((value) => value?.toLowerCase().includes(query));
  });
});
const districtSbts = computed(() => {
  if (search.value.trim() || onlyMine.value) return matchingSbts.value;
  const start = selectedDistrict.value * districtSize;
  return sbts.value.slice(start, start + districtSize);
});
const resultLabel = computed(() => {
  if (onlyMine.value) return props.locale === "ja" ? `自分の玉垣 ${districtSbts.value.length}本` : `${districtSbts.value.length} of my Tamagaki`;
  if (search.value.trim()) return props.locale === "ja" ? `検索結果 ${districtSbts.value.length}本` : `${districtSbts.value.length} results`;
  const first = selectedDistrict.value * districtSize + 1;
  const last = Math.min((selectedDistrict.value + 1) * districtSize, sbts.value.length);
  return props.locale === "ja" ? `第${selectedDistrict.value + 1}区画 · ${first}–${last}本目` : `District ${selectedDistrict.value + 1} · ${first}–${last}`;
});

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
function bitcoinSupports() { return supports.value.filter((row) => row.asset === "BTC"); }
function bitcoinTotal(route?: SupportRow["route"]) {
  return bitcoinSupports().filter((row) => !route || row.route === route)
    .reduce((sum, row) => sum + Number(formatUnits(row.amount, row.decimals ?? 8)), 0)
    .toLocaleString(undefined, { maximumFractionDigits: 8 });
}
function short(value: string) { return `${value.slice(0, 8)}…${value.slice(-6)}`; }
function amount(row: SupportRow) {
  const decimals = row.decimals ?? (row.asset === "ETH" ? 18 : row.network.jpycDecimals);
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
function isMine(sbt: SbtRow) { return sbt.owner.toLowerCase() === connectedAccount.value?.toLowerCase(); }
function districtOf(sbt: SbtRow) { return Math.max(0, Math.floor(sbts.value.indexOf(sbt) / districtSize)); }
function clearFilters() { search.value = ""; onlyMine.value = false; }
function focusSbt(sbt: SbtRow) {
  clearFilters();
  selectedDistrict.value = districtOf(sbt);
  void nextTick(() => document.getElementById(`sbt-${encodeURIComponent(sbt.globalId)}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
}
async function connectAndFindMine() {
  const ethereum = (window as typeof window & { ethereum?: EIP1193Provider }).ethereum;
  if (!ethereum) { errors.value.wallet = props.locale === "ja" ? "MetaMaskまたはCoinbase Walletが必要です。" : "MetaMask or Coinbase Wallet is required."; return; }
  try {
    const accounts = await ethereum.request({ method: "eth_requestAccounts" }) as Address[];
    connectedAccount.value = accounts[0];
    onlyMine.value = true;
    search.value = "";
  } catch (cause) { errors.value.wallet = cause instanceof Error ? cause.message : String(cause); }
}
function permalink(sbt: SbtRow) {
  const url = new URL(window.location.href);
  url.hash = `tamagaki=${encodeURIComponent(sbt.globalId)}`;
  return url.toString();
}
async function copyPermalink(sbt: SbtRow) {
  await navigator.clipboard.writeText(permalink(sbt));
  copiedId.value = sbt.globalId;
  window.setTimeout(() => { if (copiedId.value === sbt.globalId) copiedId.value = ""; }, 1800);
}
function applyDeepLink() {
  const match = window.location.hash.match(/^#tamagaki=(.+)$/);
  if (!match) return;
  const id = decodeURIComponent(match[1]);
  const sbt = sbts.value.find((row) => row.globalId === id);
  if (sbt) focusSbt(sbt);
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function isRateLimit(cause: unknown) {
  const message = cause instanceof Error ? cause.message : String(cause);
  return /\b429\b|rate.?limit|too many requests/i.test(message);
}

function publicRpcError(cause: unknown) {
  if (isRateLimit(cause)) {
    return props.locale === "ja"
      ? "公開RPCが混雑しています。取得済みデータを保持しました。少し待ってから更新してください。"
      : "The public RPC is rate-limiting requests. Previously loaded data was retained; retry shortly.";
  }
  const message = cause instanceof Error ? cause.message : String(cause);
  return message.replace(/https:\/\/[^\s]+/g, "[RPC URL]").slice(0, 500);
}

async function withRpcBackoff<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try { return await operation(); }
    catch (cause) {
      lastError = cause;
      if (!isRateLimit(cause) || attempt === 4) throw cause;
      await wait(750 * 2 ** attempt + Math.floor(Math.random() * 250));
    }
  }
  throw lastError;
}

async function fetchNetwork(network: DemoNetwork) {
  const rpcUrls = [...new Set([network.rpcUrl, ...network.rpcFallbackUrls])];
  const client = createPublicClient({
    chain: network.chain,
    transport: fallback(rpcUrls.map((url) => http(url)), { rank: true }),
  });
  const toBlock = await withRpcBackoff(() => client.getBlockNumber());
  const ranges: Array<{ fromBlock: bigint; toBlock: bigint }> = [];
  const blockSpan = 10_000n;
  for (let fromBlock = network.deploymentBlock; fromBlock <= toBlock; fromBlock += blockSpan) {
    const chunkEnd = fromBlock + blockSpan - 1n;
    ranges.push({ fromBlock, toBlock: chunkEnd < toBlock ? chunkEnd : toBlock });
  }
  const chunks = [];
  // Shared public RPCs reject bursts even when each block range is small. Keep
  // log reads sequential and retry only explicit throttling responses.
  for (const { fromBlock, toBlock: chunkToBlock } of ranges) {
    const support = await withRpcBackoff(() => client.getLogs({
      address: network.vaultAddress, event: supportEvent, fromBlock, toBlock: chunkToBlock,
    }));
    const mint = await withRpcBackoff(() => client.getLogs({
        address: network.sbtAddress, event: transferEvent, args: { from: zeroAddress },
        fromBlock, toBlock: chunkToBlock,
    }));
    chunks.push({ support, mint });
    await wait(120);
  }
  const supportLogs = chunks.flatMap((chunk) => chunk.support);
  const mintLogs = chunks.flatMap((chunk) => chunk.mint);
  const blockNumbers = [...new Set(supportLogs.map((log) => log.blockNumber))];
  const blocks = [];
  for (const blockNumber of blockNumbers) {
    blocks.push(await withRpcBackoff(() => client.getBlock({ blockNumber })));
  }
  const timestamps = new Map(blocks.map((block) => [block.number, Number(block.timestamp)]));

  const networkSupports = supportLogs.flatMap((log): SupportRow[] => {
    const { supporter, asset, amount: value, tokenId } = log.args;
    if (!supporter || !asset || value === undefined || tokenId === undefined || !log.transactionHash) return [];
    const normalized = asset.toLowerCase();
    if (normalized !== zeroAddress && normalized !== network.jpycAddress.toLowerCase()) return [];
    return [{
      network, txHash: log.transactionHash, blockNumber: log.blockNumber,
      timestamp: timestamps.get(log.blockNumber) ?? 0, supporter,
      asset: normalized === zeroAddress ? "ETH" : "MockJPYC", amount: value, tokenId, sbtAddress: network.sbtAddress,
    }];
  });
  const minted = mintLogs.flatMap((log): SbtRow[] => {
    const { to, tokenId } = log.args;
    if (!to || tokenId === undefined || !log.transactionHash) return [];
    return [{
      network, tokenId, owner: to, txHash: log.transactionHash, blockNumber: log.blockNumber,
      globalId: tamagakiGlobalId(network.chain.id, network.sbtAddress, tokenId), sbtAddress: network.sbtAddress,
    }];
  });
  const networkSbts = await Promise.all(minted.map(async (sbt) => {
    try {
      const [uri, artwork] = await Promise.all([
        client.readContract({ address: network.sbtAddress, abi: sbtAbi, functionName: "tokenURI", args: [sbt.tokenId] }),
        client.readContract({ address: network.sbtAddress, abi: sbtAbi, functionName: "artwork", args: [sbt.tokenId] }),
      ]);
      const enriched = { ...sbt, displayName: artwork.displayName, dedicationMessage: artwork.dedicationMessage };
      if (!uri.startsWith("data:application/json;base64,")) return enriched;
      const json = JSON.parse(atob(uri.slice(uri.indexOf(",") + 1))) as { image?: string };
      return { ...enriched, image: json.image };
    } catch { return sbt; }
  }));
  return { supports: networkSupports, sbts: networkSbts };
}

async function fetchBitcoinRegistry(network: DemoNetwork) {
  if (!network.bitcoinConfigured) return { supports: [] as SupportRow[], sbts: [] as SbtRow[] };
  const rpcUrls = [...new Set([network.rpcUrl, ...network.rpcFallbackUrls])];
  const client = createPublicClient({ chain: network.chain, transport: fallback(rpcUrls.map((url) => http(url)), { rank: true }) });
  const toBlock = await withRpcBackoff(() => client.getBlockNumber());
  const attested = [];
  const issued = [];
  const invalidated = [];
  for (let fromBlock = network.bitcoinDeploymentBlock; fromBlock <= toBlock; fromBlock += 10_000n) {
    const to = fromBlock + 9_999n < toBlock ? fromBlock + 9_999n : toBlock;
    attested.push(...await withRpcBackoff(() => client.getLogs({ address: network.bitcoinRegistryAddress, event: bitcoinAttestedEvent, fromBlock, toBlock: to })));
    issued.push(...await withRpcBackoff(() => client.getLogs({ address: network.bitcoinRegistryAddress, event: bitcoinIssuedEvent, fromBlock, toBlock: to })));
    invalidated.push(...await withRpcBackoff(() => client.getLogs({ address: network.bitcoinRegistryAddress, event: bitcoinInvalidatedEvent, fromBlock, toBlock: to })));
    await wait(120);
  }
  const invalidIds = new Set(invalidated.map((log) => log.args.intentHash));
  const issuedByIntent = new Map(issued.map((log) => [log.args.intentHash, log]));
  const rows = attested.flatMap((log): SupportRow[] => {
    const { intentHash, route, amount: value, recipient, observedAt } = log.args;
    const mint = intentHash ? issuedByIntent.get(intentHash) : undefined;
    if (!intentHash || invalidIds.has(intentHash) || route === undefined || value === undefined || !recipient || observedAt === undefined || !mint?.args.tokenId || !log.transactionHash) return [];
    const lightning = route === 1;
    return [{
      network, txHash: log.transactionHash, blockNumber: log.blockNumber, timestamp: Number(observedAt), supporter: recipient,
      asset: "BTC", amount: value, decimals: lightning ? 11 : 8, route: lightning ? "Lightning" : "Native Bitcoin",
      tokenId: mint.args.tokenId, sbtAddress: network.bitcoinSbtAddress,
    }];
  });
  const bitcoinSbts: SbtRow[] = rows.map((row) => ({
    network, tokenId: row.tokenId, owner: row.supporter, txHash: row.txHash, blockNumber: row.blockNumber,
    globalId: tamagakiGlobalId(network.chain.id, network.bitcoinSbtAddress, row.tokenId), sbtAddress: network.bitcoinSbtAddress, route: row.route,
  }));
  const enriched = await Promise.all(bitcoinSbts.map(async (sbt) => {
    try {
      const [uri, artwork] = await Promise.all([
        client.readContract({ address: sbt.sbtAddress, abi: sbtAbi, functionName: "tokenURI", args: [sbt.tokenId] }),
        client.readContract({ address: sbt.sbtAddress, abi: sbtAbi, functionName: "artwork", args: [sbt.tokenId] }),
      ]);
      const metadata = uri.startsWith("data:application/json;base64,") ? JSON.parse(atob(uri.slice(uri.indexOf(",") + 1))) as { image?: string } : {};
      return { ...sbt, displayName: artwork.displayName, dedicationMessage: artwork.dedicationMessage, image: metadata.image };
    } catch { return sbt; }
  }));
  return { supports: rows, sbts: enriched };
}

async function refresh() {
  loading.value = true;
  errors.value = {};
  const results = await Promise.all(networks.value.map(async (network) => {
    try {
      const [evm, bitcoin] = await Promise.all([fetchNetwork(network), fetchBitcoinRegistry(network)]);
      return { network, supports: [...evm.supports, ...bitcoin.supports], sbts: [...evm.sbts, ...bitcoin.sbts] };
    }
    catch (cause) {
      errors.value[network.key] = publicRpcError(cause);
      return {
        network,
        supports: supports.value.filter((row) => row.network.key === network.key),
        sbts: sbts.value.filter((row) => row.network.key === network.key),
      };
    }
  }));
  supports.value = results.flatMap((result) => result.supports).sort((a, b) => b.timestamp - a.timestamp);
  sbts.value = results.flatMap((result) => result.sbts).sort((a, b) => Number(b.blockNumber - a.blockNumber));
  selectedDistrict.value = Math.max(0, districtCount.value - 1);
  lastUpdated.value = new Date();
  loading.value = false;
  await nextTick();
  applyDeepLink();
}

onMounted(() => void refresh());
</script>

<template>
  <div class="demo-status demo-status--combined">
    <div class="demo-warning"><b>MULTICHAIN TESTNET</b>{{ locale === "ja" ? "表示されるETH・MockJPYC・Bitcoin／Lightning記録・SBTに実資産としての価値はありません。" : "The displayed ETH, MockJPYC, Bitcoin/Lightning records, and SBTs have no real-world asset value." }}</div>

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
        <div v-if="demoNetworks.baseSepolia.bitcoinConfigured" class="multichain-summary__row" role="row">
          <strong>Bitcoin / Lightning Demo<small>Registry on Base Sepolia</small></strong>
          <span><small>BTC</small>{{bitcoinTotal()}}<small>Native {{bitcoinTotal("Native Bitcoin")}} / LN {{bitcoinTotal("Lightning")}}</small></span>
          <span><small>Route</small>Native BTC + Lightning</span>
          <span><small>{{locale === "ja" ? "支援" : "Contributions"}}</small>{{bitcoinSupports().length}}</span>
          <span><small>SBT</small>{{sbts.filter((sbt) => sbt.sbtAddress === demoNetworks.baseSepolia.bitcoinSbtAddress).length}}</span>
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
      <div class="tamagaki-explorer__heading">
        <div><h2>{{locale === "ja" ? "すべての支援の玉垣" : "Tamagaki from all support routes"}}</h2><p>{{locale === "ja" ? "Ethereum、Base、Bitcoin／Lightning由来の玉垣を統合し、区画または検索から一本ずつ確認できます。" : "Browse Ethereum-, Base-, and Bitcoin/Lightning-derived Tamagaki together by district or search."}}</p></div>
        <strong>{{sbts.length.toLocaleString()}}<small>{{locale === "ja" ? "本" : " Tamagaki"}}</small></strong>
      </div>

      <div v-if="sbts.length" class="tamagaki-explorer">
        <div class="tamagaki-finder">
          <label><span>{{locale === "ja" ? "玉垣を探す" : "Find a Tamagaki"}}</span><input v-model="search" type="search" :placeholder="locale === 'ja' ? '名前・番号・ウォレット・グローバルID' : 'Name, number, wallet, or global ID'" @input="onlyMine = false"></label>
          <button type="button" class="tamagaki-finder__wallet" @click="connectAndFindMine">{{connectedAccount ? (locale === "ja" ? "自分の玉垣を再表示" : "Show mine again") : (locale === "ja" ? "ウォレットで自分の玉垣を探す" : "Find mine with wallet")}}</button>
          <button v-if="search || onlyMine" type="button" class="tamagaki-finder__clear" @click="clearFilters">{{locale === "ja" ? "解除" : "Clear"}}</button>
        </div>

        <div v-if="!search && !onlyMine && districtCount > 1" class="tamagaki-districts" aria-label="District selector">
          <button v-for="district in districtCount" :key="district" type="button" :class="{'is-active': selectedDistrict === district - 1}" @click="selectedDistrict = district - 1">{{locale === "ja" ? `第${district}区画` : `District ${district}`}}</button>
        </div>

        <div class="tamagaki-explorer__result-heading"><strong>{{resultLabel}}</strong><small>{{locale === "ja" ? "すべてのチェーンを統合して表示" : "Combined across all chains"}}</small></div>
        <div v-if="districtSbts.length" class="tamagaki-grid tamagaki-grid--explorer">
          <article v-for="sbt in districtSbts" :id="`sbt-${encodeURIComponent(sbt.globalId)}`" :key="sbt.globalId" :class="{'is-mine': isMine(sbt)}">
            <img v-if="sbt.image" :src="sbt.image" :alt="`Tamagaki SBT #${sbt.tokenId}`">
            <span v-else class="tamagaki-grid__placeholder" aria-hidden="true">熊本<br>災害支援</span>
            <span class="tamagaki-grid__chain">{{sbt.network.label}}</span>
            <span v-if="sbt.route" class="tamagaki-grid__chain">{{sbt.route}}</span>
            <span v-if="isMine(sbt)" class="tamagaki-grid__mine">{{locale === "ja" ? "あなたの玉垣" : "Your Tamagaki"}}</span>
            <span class="tamagaki-grid__number">玉垣 {{sbt.tokenId.toString().padStart(3, "0")}}</span>
            <strong>{{sbt.displayName || `SBT #${sbt.tokenId}`}}</strong><small>{{locale === "ja" ? "所有者" : "Owner"}} {{short(sbt.owner)}}</small>
            <code :title="sbt.globalId">{{sbt.globalId}}</code>
            <div class="tamagaki-grid__actions"><a :href="explorer(sbt.network, 'token', sbt.sbtAddress, sbt.tokenId)" target="_blank" rel="noreferrer">Explorer ↗</a><button type="button" @click="copyPermalink(sbt)">{{copiedId === sbt.globalId ? (locale === "ja" ? "コピー済み" : "Copied") : (locale === "ja" ? "共有URL" : "Share")}}</button></div>
          </article>
        </div>
        <div v-else class="support-trend__empty"><strong>{{locale === "ja" ? "該当する玉垣はありません" : "No matching Tamagaki"}}</strong><span>{{locale === "ja" ? "検索語または接続中のウォレットを確認してください。" : "Check the search term or connected wallet."}}</span></div>
      </div>
      <div v-else-if="!loading" class="support-trend__empty">{{locale === "ja" ? "発行済みSBTはまだありません。" : "No SBTs have been issued yet."}}</div>
    </section>

    <section class="demo-status__section">
      <p class="whitepaper-hero__eyebrow">SUPPORT EVENTS / ALL CHAINS</p><h2>{{locale === "ja" ? "支援履歴" : "Contribution history"}}</h2>
      <div class="demo-status__table-wrap"><table><thead><tr><th>{{locale === "ja" ? "日時" : "Date"}}</th><th>Chain</th><th>{{locale === "ja" ? "支援者" : "Supporter"}}</th><th>{{locale === "ja" ? "金額" : "Amount"}}</th><th>SBT</th><th>Tx</th></tr></thead><tbody>
        <tr v-for="row in supports" :key="`${row.network.key}:${row.txHash}`"><td>{{date(row.timestamp)}}</td><td>{{row.route || row.network.label}}</td><td><a :href="explorer(row.network, 'address', row.supporter)" target="_blank" rel="noreferrer"><code>{{short(row.supporter)}}</code></a></td><td><strong>{{amount(row)}}</strong> {{row.asset}}</td><td><a :href="explorer(row.network, 'token', row.sbtAddress, row.tokenId)" target="_blank" rel="noreferrer">#{{row.tokenId}}</a></td><td><a :href="explorer(row.network, 'tx', row.txHash)" target="_blank" rel="noreferrer">{{short(row.txHash)}} ↗</a></td></tr>
      </tbody></table></div>
    </section>

    <section class="demo-status__section">
      <p class="whitepaper-hero__eyebrow">DEPLOYED CONTRACTS</p><h2>{{locale === "ja" ? "チェーン別コントラクト" : "Contracts by chain"}}</h2>
      <details v-for="network in networks" :key="network.key" class="contract-details"><summary>{{network.label}} · Chain ID {{network.chain.id}}</summary><div class="contract-addresses"><a v-for="([name, address]) in addresses(network)" :key="name" :href="explorer(network, 'address', address)" target="_blank" rel="noreferrer"><span>{{name}}</span><code>{{address}}</code><b>↗</b></a></div><p class="demo-status__note">{{locale === "ja" ? "集計開始ブロック" : "Aggregation starts at block"}}: {{network.deploymentBlock}}</p></details>
    </section>
  </div>
</template>
