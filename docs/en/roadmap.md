# 8. Roadmap

## Phase 0 — Concept and prototype

- Publish the VitePress whitepaper and ADRs
- Provide a stakeholder-facing web demo
- Build Hardhat 3 contracts, tests, and Ignition deployment modules
- Validate locally without real funds

## Phase 1 — Stakeholder consultation

- Discuss purpose, recipient destination, and reporting fields with Kumamoto Prefecture
- Confirm Base ETH acceptance and Polygon official-JPYC acceptance and JPYC EX redemption with providers
- Evaluate Base data availability, forced transactions, canonical bridge, proofs, and upgrade authority separately from Polygon milestones, checkpoints, and PoS Bridge
- Select and consult an existing certified NPO; design accounting, ownership, terms, and personal-data controls
- Define contracts and responsibility boundaries for the registered provider and technical contractor
- Conduct threat modeling and external review
- Consult a Japanese-registered VASP on an NPO-named account that permits international third-party donations, VASP-to-VASP Bitcoin deposits, Travel Rule processing, reconciliation APIs, conversion, bank remittance, holds, and refunds
- Treat the Bitcoin multisig, Lightning node, direct self-custody, and BIP-322 as future paths separate from initial production

## Phase 2 — Public testnet

- Introduce production-like multisignature control and role separation
- Connect the indexer, public API, and dashboard
- Rehearse prefectural receipt and recovery reporting
- Exercise outage, chain reorganization, key loss, and emergency-pause scenarios
- Implement the L1 emergency multisig, L2 Escape Controller, and L1 Recovery Vault
- Exercise the complete path from a forced transaction through canonical withdrawal, L1 receipt, and double-payment prevention on Base Sepolia or an equivalent testnet
- Exercise JPYC-like tokens, Polygon SBTs, chain-qualified global IDs, halt/recovery, and unified aggregation on a Polygon testnet
- Threshold-attest Bitcoin Signet/testnet and Lightning test payments into a Base Sepolia Registry; exercise signed-intent claims as the standard path and one-time claim tokens only as a recovery path

## Phase 3 — Audit and limited operation

- Obtain an independent smart-contract audit
- Audit the L2/L1 escape hatch, cross-domain authentication, and address-aliasing controls
- Confirm legal, accounting, payment-services, and AML requirements
- Run a small end-to-end test from JPYC support to conversion and a separate yen donation to the Prefecture
- Verify that Base ETH and Polygon JPYC remain separately reconciled rather than being mixed into one on-chain accounting batch
- Test end-to-end reconciliation from an originator VASP through the Japanese VASP's hosted NPO account, Travel Rule acceptance, small conversion, NPO bank account, Base SBT, and prefectural transfer batch
- Without real funds, separately validate the Lightning remote signer or external provider, restricted macaroons, hot-balance cap, effective-inbound monitoring, invoice reservations, Loop Out and Native Bitcoin fallback, recovery procedure, and payment commitments
- Operate and reconcile within limited amounts and periods
- Gather feedback from supporters, Kumamoto Prefecture, and providers

## Phase 4 — Production

- Publish the official support site and contracts
- Continuously confirm prefectural receipts and publish recovery reports
- Issue financial, security, and transparency reports
- Exercise the escape hatch every six months and after an L2 or bridge upgrade
- Accept improvement proposals from the public community
- Operate VASP-to-VASP Native Bitcoin intake through the Japanese VASP's hosted NPO account with Bitcoin-derived Base Tamagaki
- Add direct self-custody Bitcoin intake only after VASP unhosted-wallet controls and separate launch approval
- Enable Lightning only in a later release after the ADR-0011 exception conditions, ADR-0012 liquidity and intake controls, and a separate launch approval are complete

Movement between phases is determined not by dates but by whether agreement, audit, and operational-readiness conditions have been met.
