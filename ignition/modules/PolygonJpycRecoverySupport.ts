import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { keccak256, stringToHex } from "viem";

const MINTER_ROLE = keccak256(stringToHex("MINTER_ROLE"));
const REPORTER_ROLE = keccak256(stringToHex("REPORTER_ROLE"));
const POLYGON_MAINNET_CHAIN_ID = 137;
const ERC20_ONLY = 2;
const OFFICIAL_POLYGON_JPYC = "0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29";

/** Production candidate for Polygon PoS: official funds-transfer-service JPYC only. */
export default buildModule("PolygonJpycRecoverySupportModule", (m) => {
  const admin = m.getParameter("admin");
  const beneficiary = m.getParameter("beneficiary");
  const reporter = m.getParameter("reporter");
  const baseTokenURI = m.getParameter("baseTokenURI");
  const jpycBalanceCap = m.getParameter("jpycBalanceCap");
  const jpycBatchCap = m.getParameter("jpycBatchCap");
  const jpycDailyCap = m.getParameter("jpycDailyCap");

  const tamagakiSBT = m.contract("TamagakiSBT", [admin, baseTokenURI]);
  const vault = m.contract("RecoverySupportVault", [
    admin,
    beneficiary,
    tamagakiSBT,
    ERC20_ONLY,
    POLYGON_MAINNET_CHAIN_ID,
    false,
    0,
    0,
    0,
  ]);
  const registry = m.contract("RecoveryAttestationRegistry", [admin, reporter]);
  const council = m.contract("RecoverySupportCouncil", [admin, tamagakiSBT]);

  m.call(tamagakiSBT, "grantRole", [MINTER_ROLE, vault], { id: "grant_polygon_vault_minter" });
  m.call(tamagakiSBT, "grantRole", [REPORTER_ROLE, reporter], { id: "grant_polygon_reporter" });
  m.call(
    vault,
    "configureAsset",
    [OFFICIAL_POLYGON_JPYC, true, jpycBalanceCap, jpycBatchCap, jpycDailyCap],
    { id: "configure_official_polygon_jpyc" },
  );

  return { tamagakiSBT, vault, registry, council };
});
