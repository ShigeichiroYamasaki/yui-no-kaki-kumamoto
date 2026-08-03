# 4. Tamagaki SBT

## Standard

Because every tamagaki represents a distinct contribution, it is based on ERC-721 and expresses non-transferability through the ERC-5192 `locked` interface. Transfers, approved transfers, and secondary trading are rejected by the contract.

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

An overview places all tamagaki around Kumamoto Castle. At high density, the interface aggregates by region, period, asset, and state. Selecting an individual tamagaki reveals its on-chain support event, transfer batch, receipt confirmation, and recovery reports.

## No financial or public rights

The Tamagaki SBT confers no ownership, repayment claim, dividend, revenue share, tax benefit, or authority over public works. It is a record of participation and a non-financial community credential.
