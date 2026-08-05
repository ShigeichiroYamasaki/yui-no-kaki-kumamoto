# 4. Tamagaki SBT

## Standard

Because every tamagaki represents a distinct contribution, it is based on ERC-721 and expresses non-transferability through the ERC-5192 `locked` interface. Transfers, approved transfers, and secondary trading are rejected by the contract.

## Multi-chain issuance

Each EVM Tamagaki SBT is issued on the same network as its contribution. An ETH contribution on Base mints a Base SBT, while a JPYC contribution on Polygon mints a Polygon SBT in the same contribution transaction.

Native Bitcoin and Lightning are explicit exceptions. Independent verifiers confirm the donation-specific Bitcoin outpoint or Lightning payment commitment and submit a threshold attestation to a Base Registry. A Base SBT is then minted to the address selected before payment; the underlying Lightning payment hash is not public. Payment and minting are non-atomic, and a pending payment is never shown as an issued SBT. A transferable Bitcoin-inscription UTXO is not treated as the official SBT.

Because a token ID is unique only within one contract, the public system uses `chainId:sbtContract:tokenId` as its global identifier. The unified indexer applies each chain's finality rule and verifies that a `supportId` has no more than one valid SBT before presenting one combined tamagaki view. Status updates and transfer batches retain their source-chain identity.

## State model

| State | Meaning |
|---|---|
| `Received` | Support transaction received |
| `Detected` | Bitcoin or Lightning payment detected but not final |
| `Confirmed` | Bitcoin confirmation or Lightning settlement verified |
| `Accepted` | Required review and threshold attestation completed |
| `Included` | Included in a transfer batch |
| `Delivered` | Credit to the Kumamoto Disaster Support Account confirmed |
| `Reported` | Related recovery report published |
| `Invalidated` | Invalidated through exception handling |

## Metadata

In the image-enabled demo, ERC-721 `tokenURI` returns JSON and a Base64-encoded SVG on-chain. The tamagaki combines the display name and optional message confirmed before payment with the actual asset, amount, and SBT number. The displayed amount is derived from the same value recorded by `SupportReceived`, never from free-form text.

The supporter edits and previews the display name and optional message in the browser before sending. The name starts blank, and the supporter enters either a real name or a self-chosen nickname. Explicit publication consent is required. Because on-chain publication cannot be completely erased, production may instead use a revocable off-chain public profile.

A hash of canonicalized input JSON is stored as `publicMetadataHash`, linking the artwork input to the contribution transaction. The contract enforces text length and control-character limits and XML-escapes rendered text.

## Display experience

An overview places Base, Polygon, and Bitcoin/Lightning-derived Base tamagaki together around Kumamoto Castle. At high density, the interface aggregates by region, period, asset, chain, and state. Selecting an individual tamagaki reveals its chain ID, SBT contract, token ID, Bitcoin outpoint or Lightning payment commitment where applicable, threshold attestation, transfer batch, receipt confirmation, and recovery reports.

## No financial or public rights

The Tamagaki SBT confers no ownership, repayment claim, dividend, revenue share, tax benefit, or authority over public works. It is a record of participation and a non-financial community credential.
