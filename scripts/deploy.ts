import { network } from "hardhat";
import RecoverySupportModule from "../ignition/modules/RecoverySupport.js";

const networkName = process.argv[2] ?? "hardhatOp";
const connection = await network.create(networkName);
const { ignition } = connection;

const deployed = await ignition.deploy(RecoverySupportModule);
console.log(`RecoverySupport deployed on ${networkName}`);
console.log(`TamagakiSBT: ${deployed.tamagakiSBT.address}`);
console.log(`RecoverySupportVault: ${deployed.vault.address}`);
console.log(`RecoveryAttestationRegistry: ${deployed.registry.address}`);
console.log(`RecoverySupportCouncil: ${deployed.council.address}`);
await connection.close();
