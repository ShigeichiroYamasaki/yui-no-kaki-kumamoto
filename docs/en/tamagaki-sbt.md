# 4. Tamagaki SBT

## Standard

Because every tamagaki represents a distinct contribution, it is based on ERC-721 and expresses non-transferability through the ERC-5192 `locked` interface. Transfers, approved transfers, and secondary trading are rejected by the contract.

## Multi-chain issuance

Each Tamagaki SBT is issued on the same network as its contribution. An ETH contribution on Base mints a Base SBT, while a JPYC contribution on Polygon mints a Polygon SBT in the same contribution transaction. No bridge or oracle sends the SBT alone to another chain.

Because a token ID is unique only within one contract, the public system uses `chainId:sbtContract:tokenId` as its global identifier. The unified indexer applies each chain's finality rule and verifies that a `supportId` has no more than one valid SBT before presenting one combined tamagaki view. Status updates and transfer batches retain their source-chain identity.

## State model

| State | Meaning |
|---|---|
| `Received` | Support transaction received |
| `Included` | Included in a transfer batch |
| `Delivered` | Credit to the Kumamoto Disaster Support Account confirmed |
| `Reported` | Related recovery report published |
| `Invalidated` | Invalidated through exception handling |

## Metadata

In the image-enabled demo, ERC-721 `tokenURI` returns JSON and a Base64-encoded SVG on-chain. The tamagaki combines the display name and optional message confirmed before payment with the actual asset, amount, and SBT number. The displayed amount is derived from the same value recorded by `SupportReceived`, never from free-form text.

The supporter edits and previews the name and message in the browser before sending. Anonymous display is the default, and explicit publication consent is required. Because on-chain publication cannot be completely erased, production may instead use a revocable off-chain public profile.

A hash of canonicalized input JSON is stored as `publicMetadataHash`, linking the artwork input to the contribution transaction. The contract enforces text length and control-character limits and XML-escapes rendered text.

## Display experience

An overview places Base and Polygon tamagaki together around Kumamoto Castle. At high density, the interface aggregates by region, period, asset, chain, and state. Selecting an individual tamagaki reveals its chain ID, SBT contract, token ID, on-chain support event, transfer batch, receipt confirmation, and recovery reports.

## No financial or public rights

The Tamagaki SBT confers no ownership, repayment claim, dividend, revenue share, tax benefit, or authority over public works. It is a record of participation and a non-financial community credential.
