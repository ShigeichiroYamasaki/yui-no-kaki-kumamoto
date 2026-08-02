# 9. Risks and Disclaimer

## Principal risks

### Smart contracts

Risks include implementation defects, compromised private keys, incorrect permissions, L2 outages, and chain reorganizations. Mitigations include least privilege, pausing, multisignature approval, timelocks, audits, and incident-response procedures.

Critical scenarios include changing the recipient through a compromised administrator key, misuse of a treasury key, advisory-vote Sybil attacks using many micro-contribution wallets, explanatory double inclusion across transfer batches, and false reports from a compromised reporter. Retained-balance limits, separation of duties, eligibility snapshots, Merkle inclusion proofs, and organizational multisignatures reduce these risks.

### Public data infrastructure

RPC failures, chain reorganizations, indexer double counting, and compromise of GitHub Pages or DNS could produce incorrect totals or direct users to a false contract. Production mitigations include multiple RPC providers, finality tracking, a replayable indexer, publication of official addresses through independent channels, pinned dependencies, and a content security policy.

### Assets and exchange

Risks include ETH price volatility, liquidity, JPYC network availability, provider outages, and remittance fees. Indicative valuations are separated from confirmed yen conversion, and both accepted assets and providers are restricted.

### Legal and accounting

The nature of support funds, transfer of funds, crypto-asset exchange, accounting, tax, advertising, and personal-information obligations require analysis. Relevant professionals, public authorities, and service providers must confirm the structure before operations begin.

### Relationship with government

At present, this proposal does not indicate endorsement, partnership, or receipt of funds by Kumamoto Prefecture. Official names, logos, destinations, and reporting authority will be used only after written agreement.

### Privacy

Wallet history may allow behavior to be inferred. Production keeps personal data off-chain and makes optional public information minimal and withdrawable. A display name or message recorded with consent in the image-enabled Sepolia demo cannot be withdrawn and may become linked to the wallet; anonymous display remains available and third-party data must not be entered.

## Disclaimer

This whitepaper describes a concept and technical prototype. It is not legal, tax, accounting, or investment advice. The Tamagaki SBT is not an investment product and promises neither profit nor appreciation. No tax benefit, reward item, or donation deduction is offered.

Specifications, supported networks, participating parties, and operating procedures may change through consultation and validation. Actual support intake will be announced separately only after the necessary agreements, audits, terms, and operational arrangements are in place.
