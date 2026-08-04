import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { keccak256, stringToHex } from "viem";

const MINTER_ROLE = keccak256(stringToHex("MINTER_ROLE"));
const REPORTER_ROLE = keccak256(stringToHex("REPORTER_ROLE"));
const BASE_MAINNET_CHAIN_ID = 8453;
const NATIVE_ONLY = 1;

/** Production candidate for Base Mainnet: native ETH only. */
export default buildModule("BaseEthRecoverySupportModule", (m) => {
  const admin = m.getParameter("admin");
  const beneficiary = m.getParameter("beneficiary");
  const reporter = m.getParameter("reporter");
  const baseTokenURI = m.getParameter("baseTokenURI");
  const nativeBalanceCap = m.getParameter("nativeBalanceCap");
  const nativeBatchCap = m.getParameter("nativeBatchCap");
  const nativeDailyCap = m.getParameter("nativeDailyCap");

  const tamagakiSBT = m.contract("TamagakiSBT", [admin, baseTokenURI]);
  const vault = m.contract("RecoverySupportVault", [
    admin,
    beneficiary,
    tamagakiSBT,
    NATIVE_ONLY,
    BASE_MAINNET_CHAIN_ID,
    true,
    nativeBalanceCap,
    nativeBatchCap,
    nativeDailyCap,
  ]);
  const registry = m.contract("RecoveryAttestationRegistry", [admin, reporter]);
  const council = m.contract("RecoverySupportCouncil", [admin, tamagakiSBT]);

  m.call(tamagakiSBT, "grantRole", [MINTER_ROLE, vault], { id: "grant_base_vault_minter" });
  m.call(tamagakiSBT, "grantRole", [REPORTER_ROLE, reporter], { id: "grant_base_reporter" });

  return { tamagakiSBT, vault, registry, council };
});
