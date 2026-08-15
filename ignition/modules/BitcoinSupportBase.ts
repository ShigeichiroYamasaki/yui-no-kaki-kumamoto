import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { keccak256, stringToHex } from "viem";

const MINTER_ROLE = keccak256(stringToHex("MINTER_ROLE"));
const REPORTER_ROLE = keccak256(stringToHex("REPORTER_ROLE"));

/**
 * Bitcoin Signet/testnet -> Base Sepolia attestation prototype.
 * Verifier signatures submitted to the Registry are sorted by recovered numeric address.
 */
export default buildModule("BitcoinSupportBaseModule", (m) => {
  // All security-sensitive roles are explicit parameters. Referencing
  // m.getAccount(1..3) as defaults fails validation on remote networks where
  // Hardhat is intentionally configured with only the deployer account.
  const admin = m.getParameter("admin");
  const baseTokenURI = m.getParameter("baseTokenURI");
  const threshold = m.getParameter("threshold");
  const verifier1 = m.getParameter("verifier1");
  const verifier2 = m.getParameter("verifier2");
  const verifier3 = m.getParameter("verifier3");
  const expectedChainId = m.getParameter("expectedChainId");

  const tamagakiSBT = m.contract("TamagakiSBT", [admin, baseTokenURI], { id: "BitcoinTamagakiSBT" });
  const bitcoinSupportRegistry = m.contract("BitcoinSupportRegistry", [
    admin,
    tamagakiSBT,
    threshold,
    [verifier1, verifier2, verifier3],
    expectedChainId,
  ]);

  m.call(tamagakiSBT, "grantRole", [MINTER_ROLE, bitcoinSupportRegistry], {
    id: "grant_bitcoin_registry_minter",
  });
  m.call(tamagakiSBT, "grantRole", [REPORTER_ROLE, bitcoinSupportRegistry], {
    id: "grant_bitcoin_registry_reporter",
  });

  return { tamagakiSBT, bitcoinSupportRegistry };
});
