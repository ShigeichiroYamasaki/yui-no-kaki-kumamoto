# Smart Contracts

The Kumamoto Relief DAO smart contracts are published and maintained in the same GitHub repository as this whitepaper. The current implementation is a prototype prepared before stakeholder coordination and has not been deployed to a production environment that accepts real funds.

[View all contract source code on GitHub](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/tree/main/contracts)

## Contract structure

| Contract | Role | Source code |
|---|---|---|
| RecoverySupportVault | Receives ETH and approved ERC-20 support and records transfers to the designated destination. | [RecoverySupportVault.sol](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/blob/main/contracts/RecoverySupportVault.sol) |
| TamagakiSBT | Issues non-transferable ERC-721 and ERC-5192 Tamagaki SBTs as proof of participation. | [TamagakiSBT.sol](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/blob/main/contracts/TamagakiSBT.sol) |
| RecoveryAttestationRegistry | Records document hashes and references for prefectural receipt confirmation and recovery reporting. | [RecoveryAttestationRegistry.sol](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/blob/main/contracts/RecoveryAttestationRegistry.sol) |
| RecoverySupportCouncil | Provides non-binding quadratic advisory voting for SBT holders and has no authority to move funds. | [RecoverySupportCouncil.sol](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/blob/main/contracts/RecoverySupportCouncil.sol) |
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
- Production does not store personal data such as names, addresses, or precise locations on-chain. Only the image-enabled Sepolia demo can record a consented optional display name and message on-chain.
- Council voting is advisory and does not bind Kumamoto Prefecture's budget or public works.
- Production requires an external audit, multisignature control, timelocks, a formal receipt agreement, and confirmation of the official JPYC address on the selected network.

See the [system architecture](./architecture) for the wider technical design. The original [ADR records](../adr/) are currently maintained in Japanese.

## Tamagaki SBT technical specification

### Standards and transfer restriction

- The token is based on ERC-721 and advertises ERC-5192 support through `supportsInterface(0xb45a3c0e)`.
- Its collection name is `Kumamoto Digital Tamagaki`, symbol `KDT`, and token IDs start at 1.
- Only the Vault holding `MINTER_ROLE` mints tokens. Every `transferFrom` or `safeTransferFrom` operation other than minting or burning reverts with `Soulbound`.
- `locked(tokenId)` always returns `true` for an existing token, and minting emits the ERC-5192 `Locked` event.

### Minted data

Each token stores a `supportId`, a `publicMetadataHash`, support status, and the following artwork data.

| Field | Type | Constraint and meaning |
|---|---|---|
| `displayName` | `string` | Up to 72 UTF-8 bytes; the UI starts blank and requires a real name or supporter-chosen nickname |
| `dedicationMessage` | `string` | Up to 180 UTF-8 bytes |
| `assetLabel` | `string` | Up to 16 UTF-8 bytes; supplied by the Vault from ETH or an allowlisted ERC-20 |
| `amount` | `uint256` | `msg.value` or the token quantity actually received by the Vault, never a user-entered display value |
| `assetDecimals` | `uint8` | Up to 18, used for human-readable formatting |
| `showAmount` | `bool` | Controls SVG display only; it does not hide the amount in support events |

Control characters are rejected. Text is XML-escaped for SVG and JSON-escaped for metadata. The demo UI applies stricter limits of 20 characters for the name and 50 characters for the message.

### Minting interface

The image-enabled path uses:

```solidity
supportNativeWithMetadata(bytes32 supportId, bytes32 countryCode, address sbtRecipient,
  bytes32 publicMetadataHash, ArtworkInput artwork)

supportERC20WithMetadata(IERC20 token, uint256 amount, bytes32 supportId,
  bytes32 countryCode, address sbtRecipient, bytes32 publicMetadataHash,
  ArtworkInput artwork)

mintWithMetadata(address to, bytes32 supportId, bytes32 publicMetadataHash,
  Artwork artwork)
```

Legacy `supportNative`, `supportERC20`, and `mint` functions remain for backward compatibility. Tokens minted without artwork return the configured `baseURI`. Artwork is immutable after minting; `updatePublicMetadataHash` changes only the verification hash, not the SVG.

### `tokenURI` and image

An artwork token returns a `data:application/json;base64,...` URI. Its JSON contains a name, description, `data:image/svg+xml;base64,...` image, and Asset, Amount, and Soulbound attributes. Every SVG uses the same tall vermilion-board dimensions regardless of amount, with a black header, token ID, vertically written display name, actual received amount when enabled, dedication message, and a small SBT attestation mark. Many tokens are presented side by side as one fence surrounding Kumamoto Castle. Each image remains reproducible from chain data without an external image server or IPFS.

The UI derives `publicMetadataHash` from normalized JSON for comparing the pre-send preview with the minted result. Consent cannot be enforced by the contract itself, however, because a direct caller can bypass the UI. Production privacy must therefore not depend on the frontend alone, and adoption of metadata-enabled functions requires a separate decision under [ADR-0005](../adr/0005-privacy-and-public-data).

## On-chain aggregation on the home page

The home page uses a read-only Viem Public Client to retrieve `SupportReceived` events from `RecoverySupportVault` every 30 seconds. Block timestamps and asset addresses are used to calculate cumulative ETH, cumulative JPYC, and the contribution count. Testnet totals and the SBT gallery are kept on the demo status page.

For GitHub Pages, configure `MAINNET_RPC_URL`, `MAINNET_VAULT_ADDRESS`, `MAINNET_JPYC_ADDRESS`, and `MAINNET_DEPLOYMENT_BLOCK` for the production display; configure `RECOVERY_RPC_URL`, `RECOVERY_VAULT_ADDRESS`, `JPYC_ADDRESS`, `RECOVERY_DEPLOYMENT_BLOCK`, and `JPYC_DECIMALS` separately for the demo. Sending through the image-enabled demo is enabled only when `TAMAGAKI_METADATA_VERSION=2`. No private key or write permission is used. Missing configuration produces an awaiting-connection state rather than fabricated data.
