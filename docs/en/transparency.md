# 5. Transparency and Data

## Real-time visualization

The dashboard always presents three asset rows: Base ETH, Polygon JPYC, and Bitcoin BTC. The Bitcoin row combines Native Bitcoin and, when enabled, Lightning in BTC while retaining a route breakdown. It updates valid support counts, EVM wallet counts as a reference metric, quantities by asset, indicative valuation, confirmed yen conversion, country or regional distribution, trends over time, consolidation batches, amounts remitted to the Prefecture, balances, and recovery progress according to each network's finality. Because one person cannot be identified reliably across chains, wallet or intent counts are not labeled as unique people. A disabled route is labeled “not accepting contributions” rather than shown as zero activity.

Contributions awaiting block confirmation are labeled “pending” and excluded from finalized totals. If the indexer is unavailable, the time of the last successful synchronization is displayed.

For Bitcoin, the interface shows the last agreed block height, confirmation count, and threshold-attestation state. When Lightning is enabled, it shows invoice settlement and the domain-separated payment commitment without publishing the payment hash, preimage, node credentials, or private supporter data.

## Canonical aggregation and units

- Final Base and Polygon totals use only `SupportReceived` events filtered by the published Vault address, chain ID, asset, and start block.
- Final Native Bitcoin and Lightning totals use only valid `SupportAttested` events from the Base `BitcoinSupportRegistry`. The source Bitcoin transaction, Lightning `SETTLED` record, `BitcoinTamagakiIssued`, and SBT mint are used for status and verification, never added again as contribution value.
- A support record followed by `SupportInvalidated` is removed from final amount and count while the correction history and reason remain visible. Pending Bitcoin transactions and unsettled invoices are excluded from finalized totals.
- Canonical keys are `chainId:vault:supportId` for EVM, `bitcoin:network:txid:vout` for Native Bitcoin, and `lightning:network:domain-separated-payment-commitment` for Lightning. The support count is the number of valid canonical keys.
- Native Bitcoin Registry amounts are satoshis and Lightning amounts are millisatoshis. `Native BTC = sum(satoshi) / 10^8`, `Lightning BTC = sum(millisatoshi) / 10^11`, and `Bitcoin BTC = Native BTC + Lightning BTC`. The API also publishes the unrounded integer values.
- The timeline retains both Registry `observedAt` as the support-observation time and the Base event block time as the final-registration time. The indexer cross-checks Native Bitcoin block evidence or restricted Lightning settlement evidence. The Registry contract verifies threshold signatures; it does not itself verify Bitcoin confirmations or Lightning settlement.

Asset reconciliation and yen conversion/remittance reconciliation are separate. Per asset, `final accepted amount = unconsolidated balance + amount transferred to a provider + explicit asset-denominated fees + corrections`. Per conversion batch, `gross yen proceeds = yen remitted to the Prefecture + yen pending + explicit yen-denominated fees`. ETH, JPYC, BTC, and yen are never added directly into one quantity. Indicative valuations disclose their price source and timestamp and are not accounting totals.

## Privacy

In production, names, addresses, email addresses, IP addresses, precise locations, and identity-verification data are not stored on-chain. Wallets are not casually linked to identity. Country, public name, and message are voluntary and withdrawable off-chain.

The image-enabled Sepolia demo may record an optional display name and message in the on-chain SVG only after explicit consent. Those fields and on-chain events cannot be deleted or corrected; production off-chain profiles can be withdrawn. This distinction is disclosed before support is submitted.

## Feedback from Kumamoto Prefecture

Recovery reports include a project ID, category, region, progress percentage, amount of support applied, update date, and report hash. Corrections do not overwrite the past; they are appended as new reports.

The interface describes the relationship between overall support and the overall recovery program. It avoids implying that a particular contribution directly purchased a particular construction project.

## Verifiability

Contract addresses, ABIs, event specifications, chain IDs, and aggregation rules are published so third parties can calculate results independently.
