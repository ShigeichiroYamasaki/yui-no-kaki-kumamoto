import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { keccak256, stringToHex, zeroAddress } from "viem";

const MINTER_ROLE = keccak256(stringToHex("MINTER_ROLE"));
const REPORTER_ROLE = keccak256(stringToHex("REPORTER_ROLE"));

export default buildModule("RecoverySupportModule", (m) => {
  const admin = m.getParameter("admin", m.getAccount(0));
  const beneficiary = m.getParameter("beneficiary", m.getAccount(0));
  const reporter = m.getParameter("reporter", m.getAccount(0));
  const baseTokenURI = m.getParameter("baseTokenURI", "ipfs://kumamoto-tamagaki/");
  const approvedJpyc = m.getParameter("approvedJpyc", zeroAddress);

  const tamagakiSBT = m.contract("TamagakiSBT", [admin, baseTokenURI]);
  const vault = m.contract("RecoverySupportVault", [admin, beneficiary, tamagakiSBT]);
  const registry = m.contract("RecoveryAttestationRegistry", [admin, reporter]);
  const council = m.contract("RecoverySupportCouncil", [admin, tamagakiSBT]);

  m.call(tamagakiSBT, "grantRole", [MINTER_ROLE, vault], { id: "grant_vault_minter" });
  m.call(tamagakiSBT, "grantRole", [REPORTER_ROLE, reporter], { id: "grant_prefecture_reporter" });

  // The zero address represents the native asset, so the default is a harmless
  // idempotent call. Production parameters replace it with the approved JPYC address.
  m.call(vault, "setAllowedAsset", [approvedJpyc, true], { id: "allow_official_jpyc" });

  return { tamagakiSBT, vault, registry, council };
});
