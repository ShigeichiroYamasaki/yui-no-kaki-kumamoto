<script setup lang="ts">
import { computed, ref } from "vue";
import { sepolia } from "viem/chains";
import {
  createPublicClient, createWalletClient, custom, decodeEventLog, formatEther, http,
  keccak256, parseEther, parseUnits, stringToHex, zeroHash,
  type Address, type EIP1193Provider, type Hash,
} from "viem";

const vault = (import.meta.env.VITE_RECOVERY_VAULT_ADDRESS || "0x6B8BE5103712368fe276499393B53DC26e805c1C") as Address;
const jpyc = (import.meta.env.VITE_JPYC_ADDRESS || "0x2d61d67cBe34208b524980F815358184858ba80f") as Address;
const sbt = (import.meta.env.VITE_TAMAGAKI_SBT_ADDRESS || "0xC2D1fAC9517544A839D35e67008c76A1839366aA") as Address;
const rpc = (import.meta.env.VITE_RECOVERY_RPC_URL as string | undefined) || "https://ethereum-sepolia-rpc.publicnode.com";
const metadataVersion = import.meta.env.VITE_TAMAGAKI_METADATA_VERSION as string | undefined;
const metadataReady = metadataVersion === "2";

const account = ref<Address>();
const assetType = ref<"ETH" | "MockJPYC">("ETH");
const ethAmount = ref("0.001");
const jpycAmount = ref("1000");
const displayName = ref("");
const dedicationMessage = ref("熊本の復興を応援します");
const showAmount = ref(true);
const publicationConsent = ref(false);
const busy = ref("");
const message = ref("");
const lastTx = ref<Hash>();
const tokenId = ref<bigint>();
const balance = ref("0");
const publicClient = createPublicClient({ chain: sepolia, transport: http(rpc) });

const vaultAbi = [
  { type:"function", name:"supportNativeWithMetadata", stateMutability:"payable", inputs:[
    {name:"countryCodeHash",type:"bytes32"},{name:"messageHash",type:"bytes32"},{name:"sbtRecipient",type:"address"},{name:"publicMetadataHash",type:"bytes32"},
    {name:"artworkInput",type:"tuple",components:[{name:"displayName",type:"string"},{name:"dedicationMessage",type:"string"},{name:"showAmount",type:"bool"}]},
  ], outputs:[{type:"bytes32"},{type:"uint256"}] },
  { type:"function", name:"supportERC20WithMetadata", stateMutability:"nonpayable", inputs:[
    {name:"asset",type:"address"},{name:"amount",type:"uint256"},{name:"countryCodeHash",type:"bytes32"},{name:"messageHash",type:"bytes32"},{name:"sbtRecipient",type:"address"},{name:"publicMetadataHash",type:"bytes32"},
    {name:"artworkInput",type:"tuple",components:[{name:"displayName",type:"string"},{name:"dedicationMessage",type:"string"},{name:"showAmount",type:"bool"}]},
  ], outputs:[{type:"bytes32"},{type:"uint256"}] },
  {type:"event",name:"SupportReceived",inputs:[{indexed:true,name:"supportId",type:"bytes32"},{indexed:true,name:"supporter",type:"address"},{indexed:true,name:"asset",type:"address"},{indexed:false,name:"amount",type:"uint256"},{indexed:false,name:"countryCodeHash",type:"bytes32"},{indexed:false,name:"messageHash",type:"bytes32"},{indexed:false,name:"tokenId",type:"uint256"}]},
] as const;
const tokenAbi = [
  {type:"function",name:"faucet",stateMutability:"nonpayable",inputs:[],outputs:[]},
  {type:"function",name:"approve",stateMutability:"nonpayable",inputs:[{name:"spender",type:"address"},{name:"amount",type:"uint256"}],outputs:[{type:"bool"}]},
  {type:"function",name:"balanceOf",stateMutability:"view",inputs:[{name:"account",type:"address"}],outputs:[{type:"uint256"}]},
] as const;

const shortAccount = computed(() => account.value ? `${account.value.slice(0,6)}…${account.value.slice(-4)}` : "");
const previewAmount = computed(() => assetType.value === "ETH" ? ethAmount.value : jpycAmount.value);
const previewAsset = computed(() => assetType.value === "ETH" ? "ETH" : "MockJPYC");
const canSubmit = computed(() => Boolean(
  metadataReady && account.value && publicationConsent.value && displayName.value.trim()
  && dedicationMessage.value.trim() && !busy.value,
));

function provider(): EIP1193Provider {
  const p = (window as typeof window & {ethereum?:EIP1193Provider}).ethereum;
  if (!p) throw new Error("MetaMaskまたはCoinbase Walletが必要です");
  return p;
}
async function wallet() {
  const p = provider();
  try {
    await p.request({method:"wallet_switchEthereumChain",params:[{chainId:"0xaa36a7"}]});
  } catch {
    await p.request({method:"wallet_addEthereumChain",params:[{chainId:"0xaa36a7",chainName:"Sepolia",nativeCurrency:{name:"Sepolia Ether",symbol:"ETH",decimals:18},rpcUrls:[rpc],blockExplorerUrls:["https://sepolia.etherscan.io"]}]});
  }
  return createWalletClient({account:account.value,chain:sepolia,transport:custom(p)});
}
async function connect() {
  try {
    const addresses = await provider().request({method:"eth_requestAccounts"}) as Address[];
    account.value = addresses[0];
    await wallet();
    await refreshBalance();
    message.value = "Ethereum Sepoliaに接続しました";
  } catch (cause) { message.value = cause instanceof Error ? cause.message : String(cause); }
}
async function refreshBalance() {
  if (!account.value) return;
  const value = await publicClient.readContract({address:jpyc,abi:tokenAbi,functionName:"balanceOf",args:[account.value]});
  balance.value = Number(formatEther(value)).toLocaleString();
}
async function run(label:string, action:()=>Promise<Hash>) {
  busy.value = label;
  message.value = "ウォレットで内容を確認してください";
  try {
    const hash = await action();
    lastTx.value = hash;
    message.value = "トランザクション確認中…";
    const receipt = await publicClient.waitForTransactionReceipt({hash});
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({abi:vaultAbi,data:log.data,topics:log.topics});
        if (decoded.eventName === "SupportReceived") tokenId.value = decoded.args.tokenId;
      } catch { /* unrelated log */ }
    }
    message.value = "支援と玉垣SBTの発行が完了しました";
    await refreshBalance();
  } catch (cause) { message.value = cause instanceof Error ? cause.message : String(cause); }
  finally { busy.value = ""; }
}
async function faucet() {
  if (!account.value) return;
  const w = await wallet();
  await run("faucet", () => w.writeContract({address:jpyc,abi:tokenAbi,functionName:"faucet"}));
}
function artworkInput() {
  return { displayName: displayName.value.trim(), dedicationMessage: dedicationMessage.value.trim(), showAmount: showAmount.value } as const;
}
function metadataHash() {
  const canonical = JSON.stringify({version:2, ...artworkInput()});
  return keccak256(stringToHex(canonical));
}
function common() {
  return [
    keccak256(stringToHex("JP")),
    keccak256(stringToHex(dedicationMessage.value.trim())),
    account.value!, metadataHash(), artworkInput(),
  ] as const;
}
async function submitSupport() {
  if (!canSubmit.value) return;
  const w = await wallet();
  if (assetType.value === "ETH") {
    await run("support", () => w.writeContract({
      address:vault, abi:vaultAbi, functionName:"supportNativeWithMetadata",
      args:common(), value:parseEther(ethAmount.value),
    }));
    return;
  }
  const amount = parseUnits(jpycAmount.value, 18);
  busy.value = "support";
  try {
    message.value = "まず今回の支援額だけMockJPYCの利用を承認します";
    const approval = await w.writeContract({address:jpyc,abi:tokenAbi,functionName:"approve",args:[vault,amount]});
    await publicClient.waitForTransactionReceipt({hash:approval});
    await run("support", () => w.writeContract({
      address:vault, abi:vaultAbi, functionName:"supportERC20WithMetadata",
      args:[jpyc, amount, ...common()],
    }));
  } finally { busy.value = ""; }
}
</script>

<template>
  <section class="testnet-demo">
    <div class="demo-warning"><b>ETHEREUM SEPOLIA TESTNET</b>実資産ではありません。入力した氏名とメッセージは、送金後に公開ブロックチェーンへ記録されます。</div>
    <div v-if="!metadataReady" class="metadata-upgrade-notice"><strong>画像メタデータ対応版の再デプロイ待ちです</strong><span>編集とプレビューは利用できますが、新しいコントラクトアドレスを設定するまで送金ボタンは無効です。</span></div>

    <button class="demo-primary" @click="connect">{{ account ? shortAccount : "ウォレットを接続" }}</button>
    <div class="demo-faucets"><a href="https://ethereum.org/developers/docs/networks/#sepolia" target="_blank" rel="noreferrer">Sepolia ETH Faucet一覧 ↗</a><button :disabled="!account||!!busy" @click="faucet">MockJPYCを100,000受け取る</button><span>残高 {{balance}} mJPYC</span></div>

    <div class="tamagaki-editor">
      <form class="tamagaki-editor__form" @submit.prevent="submitSupport">
        <h2>玉垣を編集</h2>
        <p>送金前なら何度でも変更できます。送金額は実際のトランザクションからSBTへ記録されます。</p>
        <fieldset><legend>支援資産</legend><label><input v-model="assetType" type="radio" value="ETH"> ETH</label><label><input v-model="assetType" type="radio" value="MockJPYC"> MockJPYC</label></fieldset>
        <label class="editor-field"><span>支援額</span><input v-if="assetType==='ETH'" v-model="ethAmount" inputmode="decimal"><input v-else v-model="jpycAmount" inputmode="decimal"><small>{{previewAsset}}</small></label>
        <label class="editor-field"><span>玉垣に表示する名前（ニックネーム可）</span><input v-model="displayName" maxlength="20" placeholder="例：くまもと応援団"><small>実名を公開したくない場合は、自分で決めたニックネームを入力してください。</small></label>
        <label class="editor-field"><span>メッセージ</span><input v-model="dedicationMessage" maxlength="50"><small>50文字以内</small></label>
        <label class="editor-check"><input v-model="showAmount" type="checkbox"> 玉垣に支援金額を表示する</label>
        <label class="editor-check editor-consent"><input v-model="publicationConsent" type="checkbox"> 氏名・メッセージが公開され、完全には削除できないことを理解しました</label>
        <button class="demo-primary" type="submit" :disabled="!canSubmit">{{busy ? "処理中…" : `${previewAsset}で支援してSBTを受け取る`}}</button>
      </form>

      <div class="tamagaki-preview" aria-label="玉垣SBTのプレビュー">
        <div class="tamagaki-preview__row">
          <div class="tamagaki-preview__neighbor"><header>熊本災害支援</header><strong>復興を願う人</strong><footer class="tamagaki-sbt-mark">TAMAGAKI SBT</footer></div>
          <div class="tamagaki-preview__neighbor"><header>熊本災害支援</header><strong>KUMAMOTO</strong><footer class="tamagaki-sbt-mark">TAMAGAKI SBT</footer></div>
          <article>
            <header>熊本災害支援</header>
            <small class="tamagaki-preview__serial">No. —</small>
            <strong>{{displayName || "ニックネーム"}}</strong>
            <div class="tamagaki-preview__details">
              <b>{{showAmount ? `${previewAmount} ${previewAsset}` : "金額非公開"}}</b>
              <p>{{dedicationMessage}}</p>
              <footer class="tamagaki-sbt-mark">TAMAGAKI SBT</footer>
            </div>
          </article>
          <div class="tamagaki-preview__neighbor"><header>熊本災害支援</header><strong>肥後の風</strong><footer class="tamagaki-sbt-mark">TAMAGAKI SBT</footer></div>
          <div class="tamagaki-preview__neighbor"><header>熊本災害支援</header><strong>RELIEF</strong><footer class="tamagaki-sbt-mark">TAMAGAKI SBT</footer></div>
        </div>
      </div>
    </div>
    <p class="demo-result">{{message}} <a v-if="lastTx" :href="`https://sepolia.etherscan.io/tx/${lastTx}`" target="_blank" rel="noreferrer">Explorerで確認 ↗</a><strong v-if="tokenId"> 玉垣SBT #{{tokenId.toString()}}</strong></p>
  </section>
</template>
