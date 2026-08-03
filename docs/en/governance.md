# 6. Governance

## Role of DAO-style participation

Kumamoto Relief DAO does not replace a legal entity or administrative authority. It is a public community through which supporters can share views on recovery areas and participate in improving the project.

The production candidate appoints an existing certified NPO whose charter covers disaster relief and recovery as the legally accountable operator. Statutory decisions remain with the NPO's members' meeting, board, directors, and auditor; wallet voting does not replace them. The [system architecture](./architecture#joint-operation-led-by-a-certified-npo) defines the shared responsibilities.

## Advisory voting

Wallets holding a Tamagaki SBT can participate in non-binding quadratic advisory voting on themes such as roads and bridges, water and sewer systems, and disaster-response facilities.

- Each wallet receives 100 voice credits per proposal
- A ballot selects 1–10 votes and spends the square of that number (for example, 7 votes cost 49 credits)
- One ballot is permitted per proposal, with no additional credits based on contribution amount or SBT count
- Results aggregate views and do not bind administrative decisions
- The voting contract cannot hold or move funds

This lets every eligible wallet express intensity from the same budget while making stronger votes progressively more expensive. The constraints reduce domination by large contributors, governance attacks, and inappropriate intervention in public procurement.

## Operational roles

| Role | Primary responsibilities |
|---|---|
| Certified NPO | Terms, completion of donation, accounting, board decisions, inquiries, and agreements with providers and the Prefecture |
| NPO treasury multisig signers | Execute transfers approved through corporate procedures, with proposal, reconciliation, and signing separated |
| Kumamoto Prefecture or delegated reporter | Receipt confirmation and recovery reporting |
| Registered financial or payment provider | JPYC handling and conversion within its registrations, AML/CFT, sanctions controls, and bank remittance |
| Corporate technical contractor | Contracts, indexer, public interface, and monitoring, without ownership or unilateral control of support funds |
| Supporter community | Advisory voting, improvement proposals, and public verification |

## Change management

Changes to production administration, addition of assets, and changes to the recipient require multisignature approval and a timelock. Emergency pauses are separated from routine changes, and every operation is recorded in an audit log.

On-chain voting, multisig execution, and board resolutions have different meanings. Council results advise the board; multisig transactions technically execute an already approved decision; board resolutions constitute the NPO's legal decision. They are never treated as interchangeable.
