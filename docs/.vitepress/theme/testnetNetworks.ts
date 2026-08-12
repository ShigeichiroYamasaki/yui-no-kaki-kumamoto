import { baseSepolia, sepolia, type Chain } from "viem/chains";
import { zeroAddress, type Address } from "viem";

export type DemoNetworkKey = "sepolia" | "baseSepolia";

export type DemoNetwork = {
  key: DemoNetworkKey;
  label: string;
  chain: Chain;
  rpcUrl: string;
  rpcFallbackUrls: string[];
  explorerUrl: string;
  faucetUrl: string;
  vaultAddress: Address;
  jpycAddress: Address;
  sbtAddress: Address;
  registryAddress: Address;
  councilAddress: Address;
  bitcoinRegistryAddress: Address;
  bitcoinSbtAddress: Address;
  bitcoinDeploymentBlock: bigint;
  bitcoinConfigured: boolean;
  deploymentBlock: bigint;
  jpycDecimals: number;
  metadataVersion?: string;
  configured: boolean;
};

const address = (value: string | undefined, fallback = zeroAddress) => (value || fallback) as Address;
const configured = (...values: Address[]) => values.every((value) => value !== zeroAddress);

const sepoliaVault = address(import.meta.env.VITE_SEPOLIA_VAULT_ADDRESS || import.meta.env.VITE_RECOVERY_VAULT_ADDRESS, "0x6B8BE5103712368fe276499393B53DC26e805c1C");
const sepoliaJpyc = address(import.meta.env.VITE_SEPOLIA_JPYC_ADDRESS || import.meta.env.VITE_JPYC_ADDRESS, "0x2d61d67cBe34208b524980F815358184858ba80f");
const sepoliaSbt = address(import.meta.env.VITE_SEPOLIA_TAMAGAKI_SBT_ADDRESS || import.meta.env.VITE_TAMAGAKI_SBT_ADDRESS, "0xC2D1fAC9517544A839D35e67008c76A1839366aA");

const baseVault = address(import.meta.env.VITE_BASE_SEPOLIA_VAULT_ADDRESS);
const baseJpyc = address(import.meta.env.VITE_BASE_SEPOLIA_JPYC_ADDRESS);
const baseSbt = address(import.meta.env.VITE_BASE_SEPOLIA_TAMAGAKI_SBT_ADDRESS);

export const demoNetworks: Record<DemoNetworkKey, DemoNetwork> = {
  sepolia: {
    key: "sepolia",
    label: "Ethereum Sepolia",
    chain: sepolia,
    rpcUrl: import.meta.env.VITE_SEPOLIA_RPC_URL || import.meta.env.VITE_RECOVERY_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
    rpcFallbackUrls: ["https://ethereum-sepolia-rpc.publicnode.com", "https://rpc2.sepolia.org"],
    explorerUrl: "https://sepolia.etherscan.io",
    faucetUrl: "https://ethereum.org/developers/docs/networks/#sepolia",
    vaultAddress: sepoliaVault,
    jpycAddress: sepoliaJpyc,
    sbtAddress: sepoliaSbt,
    registryAddress: address(import.meta.env.VITE_SEPOLIA_REGISTRY_ADDRESS, "0x4378586fE4835C4dEbe86084426f4ac98fBfcCc3"),
    councilAddress: address(import.meta.env.VITE_SEPOLIA_COUNCIL_ADDRESS, "0x42d2B3A45C4Ce37De7960642eBD52aBd450B593b"),
    bitcoinRegistryAddress: zeroAddress,
    bitcoinSbtAddress: zeroAddress,
    bitcoinDeploymentBlock: 0n,
    bitcoinConfigured: false,
    deploymentBlock: BigInt(import.meta.env.VITE_SEPOLIA_DEPLOYMENT_BLOCK || import.meta.env.VITE_RECOVERY_DEPLOYMENT_BLOCK || "11395458"),
    jpycDecimals: Number(import.meta.env.VITE_SEPOLIA_JPYC_DECIMALS || import.meta.env.VITE_JPYC_DECIMALS || "18"),
    metadataVersion: import.meta.env.VITE_SEPOLIA_TAMAGAKI_METADATA_VERSION || import.meta.env.VITE_TAMAGAKI_METADATA_VERSION,
    configured: configured(sepoliaVault, sepoliaJpyc, sepoliaSbt),
  },
  baseSepolia: {
    key: "baseSepolia",
    label: "Base Sepolia",
    chain: baseSepolia,
    rpcUrl: import.meta.env.VITE_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    rpcFallbackUrls: ["https://base-sepolia-rpc.publicnode.com"],
    explorerUrl: "https://sepolia.basescan.org",
    faucetUrl: "https://docs.base.org/base-chain/tools/network-faucets",
    vaultAddress: baseVault,
    jpycAddress: baseJpyc,
    sbtAddress: baseSbt,
    registryAddress: address(import.meta.env.VITE_BASE_SEPOLIA_REGISTRY_ADDRESS),
    councilAddress: address(import.meta.env.VITE_BASE_SEPOLIA_COUNCIL_ADDRESS),
    bitcoinRegistryAddress: address(import.meta.env.VITE_BASE_SEPOLIA_BITCOIN_REGISTRY_ADDRESS),
    bitcoinSbtAddress: address(import.meta.env.VITE_BASE_SEPOLIA_BITCOIN_SBT_ADDRESS),
    bitcoinDeploymentBlock: BigInt(import.meta.env.VITE_BASE_SEPOLIA_BITCOIN_DEPLOYMENT_BLOCK || "0"),
    bitcoinConfigured: configured(address(import.meta.env.VITE_BASE_SEPOLIA_BITCOIN_REGISTRY_ADDRESS), address(import.meta.env.VITE_BASE_SEPOLIA_BITCOIN_SBT_ADDRESS)) && Boolean(import.meta.env.VITE_BASE_SEPOLIA_BITCOIN_DEPLOYMENT_BLOCK),
    deploymentBlock: BigInt(import.meta.env.VITE_BASE_SEPOLIA_DEPLOYMENT_BLOCK || "0"),
    jpycDecimals: Number(import.meta.env.VITE_BASE_SEPOLIA_JPYC_DECIMALS || "18"),
    metadataVersion: import.meta.env.VITE_BASE_SEPOLIA_TAMAGAKI_METADATA_VERSION,
    configured: configured(baseVault, baseJpyc, baseSbt),
  },
};

export const availableDemoNetworks = Object.values(demoNetworks).filter((network) => network.configured);
