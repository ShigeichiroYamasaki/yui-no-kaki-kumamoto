# Smart Contracts

The Yui no Kaki smart contracts are published and maintained in the same GitHub repository as this whitepaper. The current implementation is a prototype prepared before stakeholder coordination and has not been deployed to a production environment that accepts real funds.

[View all contract source code on GitHub](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/tree/main/contracts)

## Contract structure

| Contract | Role | Source code |
|---|---|---|
| RecoverySupportVault | Receives ETH and approved ERC-20 support and records transfers to the designated destination. | [RecoverySupportVault.sol](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/blob/main/contracts/RecoverySupportVault.sol) |
| TamagakiSBT | Issues non-transferable ERC-721 and ERC-5192 Tamagaki SBTs as proof of participation. | [TamagakiSBT.sol](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/blob/main/contracts/TamagakiSBT.sol) |
| RecoveryAttestationRegistry | Records document hashes and references for prefectural receipt confirmation and recovery reporting. | [RecoveryAttestationRegistry.sol](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/blob/main/contracts/RecoveryAttestationRegistry.sol) |
| RecoverySupportCouncil | Provides non-binding advisory voting for SBT holders and has no authority to move funds. | [RecoverySupportCouncil.sol](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/blob/main/contracts/RecoverySupportCouncil.sol) |
| MockJPYC | Test-only token for validating a JPYC-like ERC-20 support flow locally. | [MockJPYC.sol](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/blob/main/contracts/mocks/MockJPYC.sol) |

## Tests and deployment

- [Hardhat 3 configuration](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/blob/main/hardhat.config.ts)
- [Contract test suite](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/tree/main/test)
- [Hardhat Ignition deployment modules](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/tree/main/ignition/modules)
- [Example deployment parameters](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/tree/main/ignition/parameters)
- [Supplementary deployment script](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/blob/main/scripts/deploy.ts)

## Implementation boundaries

- The `RecoverySupportVault` destination is restricted to the address designated through administrative authority.
- The Tamagaki SBT rejects normal wallet-to-wallet transfers and serves only as proof of participation.
- Personal information such as names, addresses, and precise locations is not stored on-chain.
- Council voting is advisory and does not bind Kumamoto Prefecture's budget or public works.
- Production requires an external audit, multisignature control, timelocks, a formal receipt agreement, and confirmation of the official JPYC address on the selected network.

See the [system architecture](./architecture) for the wider technical design. The original [ADR records](../adr/) are currently maintained in Japanese.
