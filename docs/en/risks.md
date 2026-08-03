# 9. Security Assessment, Risks, and Disclaimer

## Assessment basis

This assessment covers the prototype code and proposed operations as of August 3, 2026. It does not replace an external audit, penetration test, or an end-to-end operational exercise with Kumamoto Prefecture and settlement providers.

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

## Adversarial scenarios

| ID | Severity | Attack or failure | Existing control | Residual risk and required control |
|---|---|---|---|---|
| A-01 | **Critical** | Compromised admin changes `beneficiary` | `AccessControl`, events, proposal and two-day delay | One compromised admin can still execute later; require separate admin multisig, admin timelock, independent address verification, and pause on change |
| A-02 | **Critical** | Compromised treasurer or colluding signers drain the Vault | Fixed beneficiary, reentrancy guard, duplicate IDs, daily/batch caps, manifest commitments | A new root and ID can reprocess support; require independent signing, inclusion database, delayed execution, and monitoring |
| A-03 | **Critical** | Provider-address substitution, address poisoning, wrong chain | Intended fixed destination | Verify through two channels, pin address/code, bind a settlement-instruction hash, run a small test, compare the complete address |
| A-04 | **High** | Malicious or unusual ERC-20 reverts, reenters, lies about metadata, or charges transfer fees | Allowlist, safe transfer, reentrancy guard, balance delta, pinned metadata/code hash | Accept only official assets, re-review upgrades, and test fee/callback behavior |
| A-05 | **High** | Compromised reporter records false prefectural receipt or recovery data | Role, immutable IDs, successor links | A false successor is still possible; require reporting multisig, evidence verification, and two-person bank reconciliation |
| A-06 | **High** | DNS, Pages, dependency, or RPC compromise redirects users | Wallet confirmation and published addresses | Add CSP, pinned dependencies and SBOM, signed releases, independent official publication, RPC cross-checking, change monitoring |
| A-07 | **High** | Reorg or indexer defect double counts events and batches | Events and batch IDs | Add finality, rollback, strict Vault/asset filters, replayable processing, accounting invariants |
| A-08 | **High** | Third-party personal data or abuse is permanently placed in SBT artwork | Length/control-character checks and escaping | Direct calls bypass UI consent; require recipient authorization, reporting process, no-real-name requirement, and prefer revocable off-chain production data |
| A-09 | **Medium** | Unsolicited SBT is minted to another address for spam or eligibility manipulation | Non-transferability and `recipient == msg.sender` | If delegated receipt is later added, require EIP-712 recipient consent |
| A-10 | **Medium** | Sybil voting through many wallets and micro-contributions | One wallet/one vote, no execution authority, proposal cutoff, valid-status check | Pre-acquired SBTs across multiple wallets remain a Sybil path |
| A-11 | **Medium** | Event volume and RPC rate limits deny public data service | Input-length limits | Add rate limiting, caching, pagination, multiple RPCs, backfill queue, and read-only degraded mode |
| A-12 | **Medium** | Sequencer, chain, gas, or settlement-provider outage | Pause and pending states | Define halt threshold, retention limit, alternate path, controlled restart, and public incident status |

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

## Operating principles

- **Four eyes:** separate proposer, reconciler, signer, and executor where possible.
- **Stop on uncertainty:** do not transfer; remain paused until legitimacy is demonstrated.
- **Least value and privilege:** minimize Vault balance, batch/day amount, and key authority.
- **Reconcile every plane:** connect chain event, provider execution, bank credit, and Registry by batch ID.
- **Correct through history:** use cancellation and successor records, never silent overwrite.
- **Keep secrets out of public evidence:** no seed, private key, bank account number, or personal data in publicly hashed documents.

See [NPO and Prefectural Operations](./prefecture-operations), [ADR-0006](../adr/0006-security-boundaries-and-verifiable-batches), [ADR-0007](../adr/0007-threat-model-and-human-error-controls), and [ADR-0008](../adr/0008-certified-npo-joint-operation).

## Legal, governmental, and privacy risks

The initial candidate treats the transaction as support to a certified NPO followed by that NPO's separate yen donation to Kumamoto Prefecture. Certified-NPO status alone does not remove Payment Services Act requirements. Ownership, management or intermediation of electronic payment instruments, AML/CFT, sanctions, accounting, tax, presentation, and privacy require confirmation by counsel, authorities, the registered provider, and the Prefecture. This proposal indicates no endorsement or partnership by any NPO or Kumamoto Prefecture.

Wallet history permits behavioral inference. A consented name and message in the image-enabled demo cannot be withdrawn. Real names are not required; supporters may choose a nickname and must not enter third-party information. Revocable off-chain presentation remains the preferred production candidate.

## Disclaimer

This whitepaper describes a concept and technical prototype. It is not legal, tax, accounting, investment advice, or a security guarantee. Tamagaki SBT promises neither profit nor appreciation. No tax benefit, reward item, or donation deduction is offered.

Specifications and operations will change through consultation, audit, and validation. Actual support intake will be announced only after all production blockers, agreements, terms, audits, and exercises are complete.
