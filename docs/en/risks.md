# 9. Security Assessment, Risks, and Disclaimer

## Assessment basis

This assessment covers the prototype code and proposed operations as of August 12, 2026. It does not replace an external audit, penetration test, or an end-to-end operational exercise with Kumamoto Prefecture and settlement providers.

| Severity | Criterion |
|---|---|
| **Critical** | Large irreversible Vault loss or remittance away from the Kumamoto Disaster Support Account |
| **High** | False receipt evidence, compromise of important authority, material accounting error, or irreversible personal-data disclosure |
| **Medium** | Temporary outage, limited misrepresentation, individual harm, or operational delay |
| **Low** | Limited impact with straightforward detection and recovery |

## Conclusion and production blockers

The current implementation is suitable for a Sepolia technical demonstration, not production custody of real funds. Production must remain blocked until:

1. administrative and treasury EOAs are fully replaced by organizational multisigs and timelocks;
2. the implemented destination proposal, two-day delay, and execution are complemented by independent approval and an admin timelock;
3. Merkle roots, settlement-instruction hashes, amount limits, expiry, and included `supportId` values bind transfer batches;
4. implemented Vault balance, batch, and daily caps are configured to finite values and maximum retention time is monitored;
5. pause, unpause, configuration, transfer, and reporting roles are separated;
6. actual ERC-20 receipt is measured by balance delta and token code hash, decimals, and symbol are pinned at allowlisting;
7. external audit, fork tests, incident exercises, and a small end-to-end settlement test are complete.
8. the L1 emergency multisig, L2 Escape Controller, and L1 Recovery Vault are implemented and audited, and the full path from forced transaction through canonical withdrawal, L1 receipt, and double-payment prevention has been exercised.

## Adversarial scenarios

| ID | Severity | Attack or failure | Existing control | Residual risk and required control |
|---|---|---|---|---|
| A-01 | **Critical** | Compromised admin changes `beneficiary` | `AccessControl`, events, proposal and two-day delay | One compromised admin can still execute later; require separate admin multisig, admin timelock, independent address verification, and pause on change |
| A-02 | **Critical** | Compromised treasurer or colluding signers drain the Vault | Fixed beneficiary, reentrancy guard, duplicate IDs, daily/batch caps, manifest commitments | A new root and ID can reprocess support; require independent signing, inclusion database, delayed execution, and monitoring |
| A-03 | **Critical** | Provider-address substitution, address poisoning, wrong chain | Intended fixed destination | Verify through two channels, pin address/code, bind a settlement-instruction hash, run a small test, compare the complete address |
| A-04 | **High** | Malicious or unusual ERC-20 reverts, reenters, lies about metadata, or charges transfer fees | Allowlist, safe transfer, reentrancy guard, balance delta, pinned metadata/code hash, and emergency disable without metadata calls | Accept only official assets, re-review upgrades, and test fee/callback behavior |
| A-05 | **High** | Compromised reporter records false prefectural receipt or recovery data | Role, immutable IDs, successor links | A false successor is still possible; require reporting multisig, evidence verification, and two-person bank reconciliation |
| A-06 | **High** | DNS, Pages, dependency, or RPC compromise redirects users | Wallet confirmation and published addresses | Add CSP, pinned dependencies and SBOM, signed releases, independent official publication, RPC cross-checking, change monitoring |
| A-07 | **High** | Reorg or indexer defect double counts events and batches | Events and batch IDs | Add finality, rollback, strict Vault/asset filters, replayable processing, accounting invariants |
| A-08 | **High** | Third-party personal data or abuse is permanently placed in SBT artwork | Length/control-character checks and escaping | Direct calls bypass UI consent; require recipient authorization, reporting process, no-real-name requirement, and prefer revocable off-chain production data |
| A-09 | **Medium** | Unsolicited SBT is minted to another address for spam or eligibility manipulation | Non-transferability and `recipient == msg.sender` | If delegated receipt is later added, require EIP-712 recipient consent |
| A-10 | **Medium** | Sybil voting through many wallets and micro-contributions | One wallet/one vote, no execution authority, proposal cutoff, valid-status check | Pre-acquired SBTs across multiple wallets remain a Sybil path |
| A-11 | **Medium** | Event volume and RPC rate limits deny public data service | Input-length limits | Add rate limiting, caching, pagination, multiple RPCs, backfill queue, and read-only degraded mode |
| A-12 | **High** | Base sequencer outage or censorship, data-availability, proof, canonical-bridge, or malicious-upgrade failure | Pause, pending state, and multiple RPCs | Alternate RPCs cannot withdraw ETH; require L1 forced transactions, canonical withdrawal, fixed Recovery Vault, L1 gas reserve, halt thresholds, and public challenge-period status |
| A-13 | **High** | Polygon validator, milestone, checkpoint, PoS Bridge, fake-JPYC, or JPYC EX redemption failure | Official asset allowlist, pause, and per-chain totals | The Base escape hatch does not apply; pin chain ID and JPYC code hash, use multiple RPCs and finalized blocks, define JPYC EX versus PoS Bridge recovery priority, caps, and halt thresholds |
| A-14 | **Critical** | Compromised or colluding Bitcoin verifiers attest a nonexistent outpoint and falsify Base SBT or accounting state | Registry implements threshold signatures, verifier epochs, `txid:vout`/commitment uniqueness, and EIP-712 version 2 | Initial intake reconciles an authenticated beneficiary-VASP record with the public chain; future direct intake uses independent Bitcoin nodes. Require timelocked verifier rotation, public reconciliation, and external audit |
| A-15 | **High** | Bitcoin reorganization, RBF, or zero-confirmation double spend is treated as final support | Registry mints only after Accepted, but Bitcoin monitoring is unimplemented | Require value-based confirmation thresholds, reorganization detection, zero-conf exclusion, and pause on watcher disagreement |
| A-16 | **Critical** | Compromise of a Bitcoin xprv, multisig signer, Lightning macaroon, or wallet key | In initial production the Japanese registered VASP holds custody, while the NPO and Base Registry hold no fund key; Bitcoin Core/LND are future components | Review the VASP's custody, compensation, and withdrawal controls. Only if direct NPO custody is later approved, require hardware multisig, two-site backup, recovery drills, and a fixed sweep destination; add restricted macaroons, remote signing or an external provider, and hot caps for Lightning |
| A-17 | **High** | Exhausted Lightning inbound liquidity, a single-peer outage, or simultaneous settlement of outstanding invoices prevents support intake | Lightning is initially disabled and Native Bitcoin remains the fallback path | Under ADR-0012, validate multiple peers, effective-capacity monitoring, invoice reservations, Loop Out, fee budgets, and the proposed 40% warning and 25% halt thresholds during limited operation |
| A-18 | **High** | A Bitcoin transaction, Lightning `SETTLED`, Registry event, and SBT mint are counted as separate contributions, or satoshis and millisatoshis are aggregated at the same scale | Registry enforces unique outpoint/commitment evidence | Use only valid `SupportAttested` as the monetary source of truth, deduplicate by canonical global ID, pin route-specific integer units, apply `SupportInvalidated`, and test public aggregation fixtures in CI |
| A-19 | **High** | A compromised single LND or invoice service fabricates Lightning settlement evidence and multiple verifiers sign the same false source | Threshold attestation and Lightning disabled initially | Organizational threshold does not make the source independent; reconcile restricted settlement evidence, payment commitment, append-only logs, and provider records, halt on disagreement, audit periodically, and cap hot exposure |
| A-20 | **Critical** | Lightning intake expands beyond donations into third-party custody or forwarding, exchange intermediation, sanctions evasion, or a laundering-oriented refund path | Lightning is initially disabled and designed as NPO own-account receipt | Under ADR-0013, prohibit general routing, supporter balances, discretionary refunds, and exchange; move Accepted BTC to the mandatory hardware multisig; require legal opinion, regulatory consultation, AML/sanctions controls, receive-only architecture, and adverse-case exercises before launch |
| A-21 | **High** | Fake or non-interoperable VASP, third-party deposits prohibited by an ordinary corporate account, or Travel Rule acceptance mistaken for proof that funds are lawful | Initial production is limited to a Japanese registered VASP's hosted NPO account | Under ADR-0014, require a contract expressly permitting international donations, supported counterparties, jurisdictions and protocols, hold/refund rules, and signed deposit records. Keep PII inside the VASP and separate Travel Rule status from the AML decision |

## Human error and insider misuse

| ID | Severity | Mistake or misuse | Prevention, detection, and recovery |
|---|---|---|---|
| H-01 | **Critical** | Seed stored in cloud, photograph, or chat | Hardware generation, two physical locations, training, access review |
| H-02 | **Critical** | Wrong Safe owners, threshold, or network | Separate creator/reviewer; independently read owners and threshold on-chain; repeat on testnet |
| H-03 | **Critical** | Wrong decimals, asset, amount, or chain | Show raw and human values, caps, simulation, decoded hardware display, small first transfer, four-eyes approval |
| H-04 | **Critical** | Old/fake provider address or missing memo/tag | Expiring approved register, two-channel verification, address book, small post-change test, provider acknowledgment |
| H-05 | **High** | Same support paid again under a new batch ID | Included-support database, Merkle root, previous-batch hash, accounting invariants, independent review |
| H-06 | **High** | Execute after quote expiry | Bind expiry, make stale execution impossible, define slippage and stop conditions |
| H-07 | **High** | Wrong bank account, holder, or purpose | Prefectural designation, out-of-band confirmation, two-person controlled-register approval, small bank test |
| H-08 | **High** | Wrong yen amount or evidence hash permanently attested | Preview, dual approval, recompute hash, cancellation and successor attestation |
| H-09 | **Medium** | Accidental pause or premature unpause | Separate roles, unpause timelock, completion approval after cause and impact analysis |
| H-10 | **Medium** | Former staff retain ownership or roles | Staff-transition checklist, quarterly access review, verify successor before removing old key |
| H-11 | **Medium** | Testnet/mainnet or MockJPYC/official JPYC confusion | Separate device/account/color/domain; always display chain ID and contract; never deploy mock to production |
| H-12 | **Medium** | Real or third-party identity entered as permanent nickname | Start blank, allow self-chosen nickname, show irreversibility immediately before signing, retain preview and off-chain option |
| H-13 | **Critical** | Wrong Bitcoin network, address, change output, or PSBT fee | Pin descriptor and network; independently decode destination, fee, and change; run a small first transfer |
| H-14 | **High** | Duplicate claims for one outpoint/payment commitment or an expired invoice counted as paid | Registry uniqueness, signed intent as the standard path, one-time recovery claim tokens, payment-hash reconciliation in a restricted audit domain, invoice-state reload, and independent pre-mint reconciliation |
| H-15 | **High** | Native Bitcoin satoshis, Lightning millisatoshis, displayed BTC, or converted yen are confused | Registry signatures bind route and amount | Pin route-specific decimals, show raw and human-readable values, use typed aggregation and boundary fixtures, and separate asset reconciliation from post-conversion yen reconciliation |

## Prototype-to-production gap

| Area | Current prototype | Production requirement |
|---|---|---|
| Administration | Same EOA may receive initial roles | Separate multisigs, timelock, remove personal EOA roles |
| Destination change | Proposal, two-day delay, and execution implemented | Admin multisig, independent verification, test transfer, admin timelock |
| Pause/unpause | Separate `PAUSER_ROLE` and `UNPAUSER_ROLE` | Assign different actors and enforce cautious recovery operations |
| Batch | Rejects duplicate IDs and binds root, instruction hash, expiry, and limits | Verify unique support-ID inclusion in generation and monitoring systems |
| ERC-20 receipt | Records balance delta and pins code hash, symbol, and decimals | Admit reviewed official assets and monitor anomalies |
| Retention | Asset balance, batch, and daily caps implemented | Configure finite limits, dwell-time alert, automated monitoring |
| Correction | Successor attestations can be linked | Reporting multisig and UI warning for superseded records |
| SBT recipient | Self-recipient only | Add EIP-712 consent only if delegated receipt is required |
| Voting | Proposal-time token-ID cutoff and valid status | Compare with block snapshots and continue Sybil-resistance review |
| On-chain name | UI consent can be bypassed | Reconsider production use; require recipient consent if retained |
| L2 escape | Not implemented; Base Sepolia support is connectivity and demo configuration only | L1 emergency multisig, Escape Controller, fixed L1 Recovery Vault, cross-domain authentication, and a complete withdrawal exercise |
| Polygon JPYC/SBT | `ERC20Only`, chain ID `137`, official-JPYC module, and global-ID helper implemented; not deployed to production | Milestone finality, recovery runbook, multi-RPC production indexer, Polygon testnet exercise, and external audit |
| Bitcoin Registry | Version 2 pre-payment intent, post-payment evidence attestation, epoch, uniqueness, SBT issuance, and invalidation are implemented; `Accepted` and `SBTIssued` occur in one transaction | Authenticated VASP deposit feed, outpoint reconciliation, persistent `DepositDetected`/`Confirmed`/`ComplianceAccepted`, reorg-aware indexer, and public aggregation. Bitcoin Core and PSBT belong only to the future direct path |
| Lightning intake | Only manual local-regtest operations and Base Registry components exist; intake service and unified aggregation are absent | Isolated LND, restricted macaroon, liquidity controls, settlement subscription, common-source controls, automated end-to-end tests, and separate launch approval |

## Operating principles

- **Four eyes:** separate proposer, reconciler, signer, and executor where possible.
- **Stop on uncertainty:** do not transfer; remain paused until legitimacy is demonstrated.
- **Least value and privilege:** minimize Vault balance, batch/day amount, and key authority.
- **Reconcile every plane:** connect chain event, provider execution, bank credit, and Registry by batch ID.
- **Correct through history:** use cancellation and successor records, never silent overwrite.
- **Keep secrets out of public evidence:** no seed, private key, bank account number, or personal data in publicly hashed documents.

See [NPO and Prefectural Operations](./prefecture-operations), [ADR-0006](../adr/0006-security-boundaries-and-verifiable-batches), [ADR-0007](../adr/0007-threat-model-and-human-error-controls), [ADR-0008](../adr/0008-certified-npo-joint-operation), and [ADR-0009](../adr/0009-l2-selection-and-escape-hatch).

## Legal, governmental, and privacy risks

The initial candidate treats the transaction as support to a certified NPO followed by that NPO's separate yen donation to Kumamoto Prefecture. Certified-NPO status alone does not remove Payment Services Act requirements. Ownership, management or intermediation of electronic payment instruments, AML/CFT, sanctions, accounting, tax, presentation, and privacy require confirmation by counsel, authorities, the registered provider, and the Prefecture. This proposal indicates no endorsement or partnership by any NPO or Kumamoto Prefecture.

Wallet history permits behavioral inference. A consented name and message in the image-enabled demo cannot be withdrawn. Real names are not required; supporters may choose a nickname and must not enter third-party information. Revocable off-chain presentation remains the preferred production candidate.

## Disclaimer

This whitepaper describes a concept and technical prototype. It is not legal, tax, accounting, investment advice, or a security guarantee. Tamagaki SBT promises neither profit nor appreciation. No tax benefit, reward item, or donation deduction is offered.

Specifications and operations will change through consultation, audit, and validation. Actual support intake will be announced only after all production blockers, agreements, terms, audits, and exercises are complete.
