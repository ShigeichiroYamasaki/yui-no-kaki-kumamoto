# 4. Tamagaki SBT

## Standard

Because every tamagaki represents a distinct contribution, it is based on ERC-721 and expresses non-transferability through the ERC-5192 `locked` interface. Transfers, approved transfers, and secondary trading are rejected by the contract.

## State model

| State | Meaning |
|---|---|
| `Received` | Support transaction received |
| `Included` | Included in a transfer batch |
| `Delivered` | Receipt by the Kumamoto-designated destination confirmed |
| `Reported` | Related recovery report published |
| `Invalidated` | Invalidated through exception handling |

## Metadata

Only the support ID and a hash of public metadata are stored on-chain. Images, optional public name, country, and message are provided off-chain so individuals can withdraw them from public display.

## Display experience

An overview places all tamagaki around Kumamoto Castle. At high density, the interface aggregates by region, period, asset, and state. Selecting an individual tamagaki reveals its on-chain support event, transfer batch, receipt confirmation, and recovery reports.

## No financial or public rights

The Tamagaki SBT confers no ownership, repayment claim, dividend, revenue share, tax benefit, or authority over public works. It is a record of participation and a non-financial community credential.
