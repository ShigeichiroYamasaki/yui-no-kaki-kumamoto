# 8. Roadmap

## Phase 0 — Concept and prototype

- Publish the VitePress whitepaper and ADRs
- Provide a stakeholder-facing web demo
- Build Hardhat 3 contracts, tests, and Ignition deployment modules
- Validate locally without real funds

## Phase 1 — Stakeholder consultation

- Discuss purpose, recipient destination, and reporting fields with Kumamoto Prefecture
- Confirm supported networks with JPYC and exchange or payment providers
- Select an L2 using data availability, forced transactions, canonical bridge, proofs, and upgrade authority as explicit criteria
- Select and consult an existing certified NPO; design accounting, ownership, terms, and personal-data controls
- Define contracts and responsibility boundaries for the registered provider and technical contractor
- Conduct threat modeling and external review

## Phase 2 — Public testnet

- Introduce production-like multisignature control and role separation
- Connect the indexer, public API, and dashboard
- Rehearse prefectural receipt and recovery reporting
- Exercise outage, chain reorganization, key loss, and emergency-pause scenarios
- Implement the L1 emergency multisig, L2 Escape Controller, and L1 Recovery Vault
- Exercise the complete path from a forced transaction through canonical withdrawal, L1 receipt, and double-payment prevention on Base Sepolia or an equivalent testnet

## Phase 3 — Audit and limited operation

- Obtain an independent smart-contract audit
- Audit the L2/L1 escape hatch, cross-domain authentication, and address-aliasing controls
- Confirm legal, accounting, payment-services, and AML requirements
- Run a small end-to-end test from JPYC support to conversion and a separate yen donation to the Prefecture
- Operate and reconcile within limited amounts and periods
- Gather feedback from supporters, Kumamoto Prefecture, and providers

## Phase 4 — Production

- Publish the official support site and contracts
- Continuously confirm prefectural receipts and publish recovery reports
- Issue financial, security, and transparency reports
- Exercise the escape hatch every six months and after an L2 or bridge upgrade
- Accept improvement proposals from the public community

Movement between phases is determined not by dates but by whether agreement, audit, and operational-readiness conditions have been met.
