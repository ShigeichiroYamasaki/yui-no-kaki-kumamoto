# Smart Contracts

The Kumamoto Relief DAO smart contracts are published and maintained in the same GitHub repository as this whitepaper. The current implementation is a prototype prepared before stakeholder coordination and has not been deployed to a production environment that accepts real funds.

[View all contract source code on GitHub](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/tree/main/contracts)

## Contract structure

| Contract | Role | Source code |
|---|---|---|
| RecoverySupportVault | Receives ETH and approved ERC-20 support and records transfers to a registered exchange or payment-provider deposit address. | [RecoverySupportVault.sol](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/blob/main/contracts/RecoverySupportVault.sol) |
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

### Add the Base Sepolia demo

Keep the Sepolia deployment and deploy the hardened contracts under a separate Ignition deployment ID:

```bash
npx hardhat keystore set BASE_SEPOLIA_RPC_URL
npx hardhat keystore set DEPLOYER_PRIVATE_KEY
npm run contracts:deploy:demo:base-sepolia:security-v3
```

Store a Base Sepolia HTTPS RPC URL in the first entry and the `0x`-prefixed private key of a testnet-only deployer in the second. Never expose that key to GitHub Pages. Map the five deployed addresses and first deployment block to `BASE_SEPOLIA_VAULT_ADDRESS`, `BASE_SEPOLIA_JPYC_ADDRESS`, `BASE_SEPOLIA_TAMAGAKI_SBT_ADDRESS`, `BASE_SEPOLIA_REGISTRY_ADDRESS`, `BASE_SEPOLIA_COUNCIL_ADDRESS`, and `BASE_SEPOLIA_DEPLOYMENT_BLOCK` under repository Actions Variables. Also set `BASE_SEPOLIA_PUBLIC_RPC_URL`, decimals `18`, and metadata version `2`. After the Pages workflow runs again, both testnet panels appear together; only the contribution form retains a network selector to prevent sending on the wrong chain.

### Base ETH and Polygon JPYC production-candidate modules

| Module | Chain guard | Fixed Vault mode | Admitted asset |
|---|---:|---|---|
| `BaseEthRecoverySupport.ts` | Base Mainnet `8453` | `NativeOnly` | ETH only |
| `PolygonJpycRecoverySupport.ts` | Polygon PoS `137` | `ERC20Only` | Official JPYC `0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29` only |

The Vault constructor checks the expected chain ID, and `AssetMode` prevents even an administrator from later adding an ERC-20 to the Base Vault or a native asset to the Polygon Vault. USDC is included in neither module nor allowlist.

Before any authorized production deployment, copy the examples to gitignored working files and independently verify the organizational Safe, provider destination, reporter, and finite caps. Store RPC URLs and the dedicated deployment key in the Hardhat keystore.

```bash
cp ignition/parameters/base-mainnet.example.json ignition/parameters/base-mainnet.json
cp ignition/parameters/polygon-mainnet.example.json ignition/parameters/polygon-mainnet.json
npx hardhat keystore set BASE_MAINNET_RPC_URL
npx hardhat keystore set POLYGON_MAINNET_RPC_URL
npx hardhat keystore set MAINNET_DEPLOYER_PRIVATE_KEY
npm run contracts:deploy:production:base
npm run contracts:deploy:production:polygon
```

The commands do not authorize production launch. Audit, stakeholder agreement, Safe/timelock setup, the Base escape hatch, and the Polygon recovery exercise remain mandatory. SBTs issued on either chain use `chainId:sbtContract:tokenId` as the global ID.

## Implementation boundaries

- The `RecoverySupportVault` destination is restricted to the registered financial or payment provider contracted by the certified NPO. Under the initial candidate, the support asset belongs to the NPO and the converted bank remittance is the NPO's separate yen donation to Kumamoto Prefecture.
- The Tamagaki SBT rejects normal wallet-to-wallet transfers and serves only as proof of participation.
- Production does not store personal data such as names, addresses, or precise locations on-chain. Only the image-enabled Sepolia demo can record a consented optional display name and message on-chain.
- Council voting is advisory and does not bind Kumamoto Prefecture's budget or public works.
- Production requires an external audit, multisignature control, timelocks, a formal receipt agreement, and confirmation of the official JPYC address on the selected network.

## Hardened-contract specification

- ERC-20 admission pins code hash, symbol, and decimals; the Vault records the pre/post balance delta as the actual receipt.
- The constructor pins the expected chain ID and `Mixed`, `NativeOnly`, or `ERC20Only` mode, rejecting wrong-chain deployment and later admission of a forbidden asset type.
- Each asset has Vault-balance, per-batch, and daily outflow caps. Demo defaults are for testing; production requires finite values.
- `transferBatch` requires a `supportRoot`, `instructionHash`, and `validUntil`, and rejects duplicate batch IDs and expired instructions.
- Beneficiary changes require a proposal and two-day delay; pause and unpause have separate roles. Post-deployment role transfer to organisational multisigs is still required.
- SBTs can be minted only to the supporter. Council voting validates a proposal-time token-ID cutoff and rejects Invalidated SBTs.
- Registry mistakes are not overwritten; linked successor attestations preserve the correction history.

See the [system architecture](./architecture) for the wider technical design. The original [ADR records](../adr/) are currently maintained in Japanese.

## Production multi-chain boundary

The repository now contains guarded Base Mainnet and Polygon Mainnet deployment modules and network configuration, but no production addresses have been deployed. The Base escape hatch, Polygon recovery runbook, and production indexer remain unimplemented. Each SBT is minted on its contribution chain, and the indexer uses `chainId:sbtContract:tokenId` to combine Base and Polygon records. Production admission pins Polygon chain ID `137` and the official JPYC address, code hash, and decimals after stakeholder confirmation.

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
supportNativeWithMetadata(bytes32 countryCodeHash, bytes32 messageHash, address sbtRecipient,
  bytes32 publicMetadataHash, ArtworkInput artwork)

supportERC20WithMetadata(IERC20 token, uint256 amount, bytes32 countryCodeHash,
  bytes32 messageHash, address sbtRecipient, bytes32 publicMetadataHash,
  ArtworkInput artwork)

mintWithMetadata(address to, bytes32 supportId, bytes32 publicMetadataHash,
  Artwork artwork)
```

Legacy `supportNative`, `supportERC20`, and `mint` functions remain for backward compatibility. Tokens minted without artwork return the configured `baseURI`. Artwork is immutable after minting; `updatePublicMetadataHash` changes only the verification hash, not the SVG.

### `tokenURI` and image

An artwork token returns a `data:application/json;base64,...` URI. Its JSON contains a name, description, `data:image/svg+xml;base64,...` image, and Asset, Amount, and Soulbound attributes. Every SVG uses the same tall vermilion-board dimensions regardless of amount, with a black header, token ID, vertically written display name, actual received amount when enabled, dedication message, and a small SBT attestation mark. Many tokens are presented side by side as one fence surrounding Kumamoto Castle. Each image remains reproducible from chain data without an external image server or IPFS.

The UI derives `publicMetadataHash` from normalized JSON for comparing the pre-send preview with the minted result. Consent cannot be enforced by the contract itself, however, because a direct caller can bypass the UI. Production privacy must therefore not depend on the frontend alone, and adoption of metadata-enabled functions requires a separate decision under [ADR-0005](../adr/0005-privacy-and-public-data).

## On-chain aggregation on the home page

The home page uses read-only Viem Public Clients and refreshes `SupportReceived` events every 30 seconds. Base ETH and Polygon JPYC appear as two rows of one table rather than separate panels, a chain selector, or an arbitrary exchange-rate total. Configure `BASE_MAINNET_PUBLIC_RPC_URL`, `BASE_MAINNET_VAULT_ADDRESS`, and `BASE_MAINNET_DEPLOYMENT_BLOCK` for Base, plus `POLYGON_MAINNET_PUBLIC_RPC_URL`, `POLYGON_MAINNET_VAULT_ADDRESS`, `POLYGON_MAINNET_JPYC_ADDRESS`, `POLYGON_MAINNET_DEPLOYMENT_BLOCK`, and `POLYGON_MAINNET_JPYC_DECIMALS` for Polygon. Testnet totals and SBTs remain isolated on the demo status page.

The existing `RECOVERY_*` GitHub Pages variables continue to configure Ethereum Sepolia. To enable Base Sepolia simultaneously, add `BASE_SEPOLIA_PUBLIC_RPC_URL`, the five `BASE_SEPOLIA_*_ADDRESS` values, `BASE_SEPOLIA_DEPLOYMENT_BLOCK`, `BASE_SEPOLIA_JPYC_DECIMALS`, and `BASE_SEPOLIA_TAMAGAKI_METADATA_VERSION=2` as GitHub Actions Variables. When its Vault, MockJPYC, and SBT addresses are all present, the Base Sepolia panel appears alongside Ethereum Sepolia while totals remain separated by chain. Pages receives no private key or write authority.
