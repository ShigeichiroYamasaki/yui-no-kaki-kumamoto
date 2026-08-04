import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { keccak256, maxUint256, stringToHex } from "viem";

const MINTER_ROLE = keccak256(stringToHex("MINTER_ROLE"));
const REPORTER_ROLE = keccak256(stringToHex("REPORTER_ROLE"));

export default buildModule("RecoverySupportModule", (m) => {
  const admin = m.getParameter("admin", m.getAccount(0));
  const beneficiary = m.getParameter("beneficiary", m.getAccount(0));
  const reporter = m.getParameter("reporter", m.getAccount(0));
  const baseTokenURI = m.getParameter("baseTokenURI", "ipfs://kumamoto-tamagaki/");
  const assetMode = m.getParameter("assetMode", 0);
  const expectedChainId = m.getParameter("expectedChainId", 0);
  const nativeAssetAllowed = m.getParameter("nativeAssetAllowed", true);
  const nativeBalanceCap = m.getParameter("nativeBalanceCap", maxUint256);
  const nativeBatchCap = m.getParameter("nativeBatchCap", maxUint256);
  const nativeDailyCap = m.getParameter("nativeDailyCap", maxUint256);

  const tamagakiSBT = m.contract("TamagakiSBT", [admin, baseTokenURI]);
  const vault = m.contract("RecoverySupportVault", [
    admin,
    beneficiary,
    tamagakiSBT,
    assetMode,
    expectedChainId,
    nativeAssetAllowed,
    nativeBalanceCap,
    nativeBatchCap,
    nativeDailyCap,
  ]);
  const registry = m.contract("RecoveryAttestationRegistry", [admin, reporter]);
  const council = m.contract("RecoverySupportCouncil", [admin, tamagakiSBT]);

  m.call(tamagakiSBT, "grantRole", [MINTER_ROLE, vault], { id: "grant_vault_minter" });
  m.call(tamagakiSBT, "grantRole", [REPORTER_ROLE, reporter], { id: "grant_prefecture_reporter" });

  return { tamagakiSBT, vault, registry, council };
});
