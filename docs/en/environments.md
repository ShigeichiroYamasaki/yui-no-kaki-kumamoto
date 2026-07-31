# 7. Production and Demo Systems

## Separation principle

The demo uses the same conceptual model as production so stakeholders can experience the proposal before formal coordination. It remains completely separated from real assets, real wallets, and real administrative systems.

| Item | Demo | Production |
|---|---|---|
| Assets | Simulated values and MockJPYC | Approved ETH and official JPYC |
| Wallet | No connection or signature | Supported wallets and signatures |
| Network | Local Hardhat network | Audited EVM network |
| Prefectural receipt | Demo identifiers and simulated states | Official destination and evidence hashes |
| Recovery reports | Simulated browser updates | Append-only updates by authorized reporters |
| Presentation | Permanently labeled as a prototype | Displays operator, terms, and operational status |

## Demo acceptance criteria

- A simulated contribution updates the tamagaki display and statistics.
- Consolidation, conversion, and prefectural receipt transitions can be reproduced.
- Recovery-report updates are visible in the interface.
- The absence of real funds is always clearly stated.
- All Hardhat contract tests pass.

## Production gates

Production intake will not begin until all of the following are complete:

1. Formal consultation with Kumamoto Prefecture and agreement on the receipt process
2. Final operating entity, accounting treatment, terms, and privacy policy
3. Confirmation of the official JPYC network and contract
4. Agreements with exchange or payment providers
5. Multisignature, timelock, and key-management arrangements
6. Independent security audit and operational exercises
