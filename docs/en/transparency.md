# 5. Transparency and Data

## Real-time visualization

The dashboard updates total contributions, unique supporting wallets, quantities by asset, indicative valuation, confirmed yen conversion, distribution by country or region, trends over time, consolidation batches, amount remitted to the prefecture, balance, and recovery-project progress according to chain finality.

Contributions awaiting block confirmation are labeled “pending” and excluded from finalized totals. If the indexer is unavailable, the time of the last successful synchronization is displayed.

## Privacy

In production, names, addresses, email addresses, IP addresses, precise locations, and identity-verification data are not stored on-chain. Wallets are not casually linked to identity. Country, public name, and message are voluntary and withdrawable off-chain.

The image-enabled Sepolia demo may record an optional display name and message in the on-chain SVG only after explicit consent. Those fields and on-chain events cannot be deleted or corrected; production off-chain profiles can be withdrawn. This distinction is disclosed before support is submitted.

## Feedback from Kumamoto Prefecture

Recovery reports include a project ID, category, region, progress percentage, amount of support applied, update date, and report hash. Corrections do not overwrite the past; they are appended as new reports.

The interface describes the relationship between overall support and the overall recovery program. It avoids implying that a particular contribution directly purchased a particular construction project.

## Verifiability

Contract addresses, ABIs, event specifications, chain IDs, and aggregation rules are published so third parties can calculate results independently.
