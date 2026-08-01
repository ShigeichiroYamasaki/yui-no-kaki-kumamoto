<script setup lang="ts">
import { computed, ref } from "vue";
import { sepolia } from "viem/chains";
import { createPublicClient, createWalletClient, custom, decodeEventLog, formatEther, http, keccak256, parseEther, parseUnits, stringToHex, zeroHash, type Address, type EIP1193Provider, type Hash } from "viem";

const vault = import.meta.env.VITE_RECOVERY_VAULT_ADDRESS as Address | undefined;
const jpyc = import.meta.env.VITE_JPYC_ADDRESS as Address | undefined;
const sbt = import.meta.env.VITE_TAMAGAKI_SBT_ADDRESS as Address | undefined;
const rpc = (import.meta.env.VITE_RECOVERY_RPC_URL as string | undefined) || "https://ethereum-sepolia-rpc.publicnode.com";
const ready = Boolean(vault && jpyc && sbt);
const account = ref<Address>();
const ethAmount = ref("0.001");
const jpycAmount = ref("1000");
const busy = ref("");
const message = ref("");
const lastTx = ref<Hash>();
const tokenId = ref<bigint>();
const balance = ref("0");
const publicClient = createPublicClient({ chain: sepolia, transport: http(rpc) });
const vaultAbi = [{ type:"function", name:"supportNative", stateMutability:"payable", inputs:[{name:"countryCodeHash",type:"bytes32"},{name:"messageHash",type:"bytes32"},{name:"sbtRecipient",type:"address"},{name:"publicMetadataHash",type:"bytes32"}], outputs:[{type:"bytes32"},{type:"uint256"}] },{ type:"function", name:"supportERC20", stateMutability:"nonpayable", inputs:[{name:"asset",type:"address"},{name:"amount",type:"uint256"},{name:"countryCodeHash",type:"bytes32"},{name:"messageHash",type:"bytes32"},{name:"sbtRecipient",type:"address"},{name:"publicMetadataHash",type:"bytes32"}], outputs:[{type:"bytes32"},{type:"uint256"}] },{type:"event",name:"SupportReceived",inputs:[{indexed:true,name:"supportId",type:"bytes32"},{indexed:true,name:"supporter",type:"address"},{indexed:true,name:"asset",type:"address"},{indexed:false,name:"amount",type:"uint256"},{indexed:false,name:"countryCodeHash",type:"bytes32"},{indexed:false,name:"messageHash",type:"bytes32"},{indexed:false,name:"tokenId",type:"uint256"}]}] as const;
const tokenAbi = [{type:"function",name:"faucet",stateMutability:"nonpayable",inputs:[],outputs:[]},{type:"function",name:"approve",stateMutability:"nonpayable",inputs:[{name:"spender",type:"address"},{name:"amount",type:"uint256"}],outputs:[{type:"bool"}]},{type:"function",name:"balanceOf",stateMutability:"view",inputs:[{name:"account",type:"address"}],outputs:[{type:"uint256"}]}] as const;
const shortAccount = computed(() => account.value ? `${account.value.slice(0,6)}…${account.value.slice(-4)}` : "");

function provider(): EIP1193Provider { const p=(window as typeof window & {ethereum?:EIP1193Provider}).ethereum; if(!p) throw new Error("MetaMaskまたはCoinbase Walletが必要です"); return p; }
async function wallet() { const p=provider(); try { await p.request({method:"wallet_switchEthereumChain",params:[{chainId:"0xaa36a7"}]}); } catch { await p.request({method:"wallet_addEthereumChain",params:[{chainId:"0xaa36a7",chainName:"Sepolia",nativeCurrency:{name:"Sepolia Ether",symbol:"ETH",decimals:18},rpcUrls:[rpc],blockExplorerUrls:["https://sepolia.etherscan.io"]}]}); } return createWalletClient({account:account.value,chain:sepolia,transport:custom(p)}); }
async function connect(){ try { const addresses=await provider().request({method:"eth_requestAccounts"}) as Address[]; account.value=addresses[0]; await wallet(); await refreshBalance(); message.value="Ethereum Sepoliaに接続しました"; } catch(e){message.value=e instanceof Error?e.message:String(e);} }
async function refreshBalance(){if(!account.value||!jpyc)return; const value=await publicClient.readContract({address:jpyc,abi:tokenAbi,functionName:"balanceOf",args:[account.value]}); balance.value=Number(formatEther(value)).toLocaleString();}
async function run(label:string, action:()=>Promise<Hash>){busy.value=label;message.value="ウォレットで確認してください";try{const hash=await action();lastTx.value=hash;message.value="トランザクション確認中…";const receipt=await publicClient.waitForTransactionReceipt({hash});for(const log of receipt.logs){try{const decoded=decodeEventLog({abi:vaultAbi,data:log.data,topics:log.topics});if(decoded.eventName==="SupportReceived")tokenId.value=decoded.args.tokenId;}catch{}}message.value="完了しました";await refreshBalance();}catch(e){message.value=e instanceof Error?e.message:String(e);}finally{busy.value="";}}
async function faucet(){if(!account.value||!jpyc)return;const w=await wallet();await run("faucet",()=>w.writeContract({address:jpyc,abi:tokenAbi,functionName:"faucet"}));}
const common=()=>[keccak256(stringToHex("JP")),zeroHash,account.value!,zeroHash] as const;
async function supportEth(){if(!account.value||!vault)return;const w=await wallet();await run("eth",()=>w.writeContract({address:vault,abi:vaultAbi,functionName:"supportNative",args:common(),value:parseEther(ethAmount.value)}));}
async function supportJpyc(){if(!account.value||!vault||!jpyc)return;const amount=parseUnits(jpycAmount.value,18);const w=await wallet();busy.value="jpyc";try{message.value="まずMockJPYCの利用を承認します";const approval=await w.writeContract({address:jpyc,abi:tokenAbi,functionName:"approve",args:[vault,amount]});await publicClient.waitForTransactionReceipt({hash:approval});await run("jpyc",()=>w.writeContract({address:vault,abi:vaultAbi,functionName:"supportERC20",args:[jpyc,amount,...common()]}));}finally{busy.value="";}}
</script>

<template><section class="testnet-demo">
  <div class="demo-warning"><b>ETHEREUM SEPOLIA TESTNET</b> 実資産ではありません。MockJPYCは公式JPYCではなく、このデモ専用トークンです。</div>
  <div v-if="!ready" class="support-trend__empty"><strong>テストネットコントラクトのデプロイ待ちです</strong><span>デプロイ完了後にコントラクトアドレスが設定され、操作が有効になります。</span></div>
  <template v-else>
    <button class="demo-primary" @click="connect">{{account?shortAccount:"ウォレットを接続"}}</button>
    <div class="demo-faucets"><a href="https://ethereum.org/developers/docs/networks/#sepolia" target="_blank" rel="noreferrer">Sepolia ETH Faucet一覧 ↗</a><button :disabled="!account||!!busy" @click="faucet">MockJPYCを100,000受け取る</button><span>残高 {{balance}} mJPYC</span></div>
    <div class="demo-support-grid"><article><h2>ETHで支援</h2><input v-model="ethAmount" inputmode="decimal"><span>ETH</span><button :disabled="!account||!!busy" @click="supportEth">送金してSBTを受け取る</button></article><article><h2>MockJPYCで支援</h2><input v-model="jpycAmount" inputmode="decimal"><span>mJPYC</span><button :disabled="!account||!!busy" @click="supportJpyc">承認・送金してSBTを受け取る</button></article></div>
    <p class="demo-result">{{message}} <a v-if="lastTx" :href="`https://sepolia.etherscan.io/tx/${lastTx}`" target="_blank" rel="noreferrer">Explorerで確認 ↗</a><strong v-if="tokenId"> 玉垣SBT #{{tokenId.toString()}}</strong></p>
  </template>
</section></template>
