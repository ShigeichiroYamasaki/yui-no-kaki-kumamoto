# 7. Production and Demo Systems

## Separation principle

The demo uses the same conceptual model as production so stakeholders can experience the proposal before formal coordination. It remains completely separated from real assets, production wallets and accounts, and real administrative systems. The UI-only demo uses no wallet; the integrated demo signs testnet transactions with a test-only wallet.

| Item | Demo | Production |
|---|---|---|
| Assets | Simulated values, MockJPYC, and Bitcoin/Lightning test assets | Approved ETH, official JPYC, and Native BTC; Lightning BTC is added only after exception approval |
| Wallet | None in the UI-only demo; test-only wallet signatures in the integrated demo | Dedicated supported production wallets and signatures |
| Network | Local Hardhat, Sepolia, Base Sepolia, Bitcoin Signet/testnet, and a Lightning test environment | ETH on Base, JPYC on Polygon, initially Native Bitcoin only, Bitcoin-derived SBTs on Base, and an Ethereum L1 recovery path for Base ETH; Lightning is enabled later |
| Prefectural receipt | Demo identifiers and simulated states | Official destination and evidence hashes |
| Recovery reports | Simulated browser updates | Append-only updates by authorized reporters |
| Presentation | Permanently labeled as a prototype | Displays the certified NPO, registered provider, terms, ownership model, and operational status |

## Demo acceptance criteria

- A simulated contribution updates the tamagaki display and statistics.
- Consolidation, conversion, and prefectural receipt transitions can be reproduced.
- Recovery-report updates are visible in the interface.
- The absence of real funds is always clearly stated.
- All Hardhat contract tests pass.
- A Bitcoin outpoint or domain-separated Lightning payment commitment produces exactly one Base Sepolia SBT, while the restricted audit mapping to the payment hash, reorganization, duplicate, and invoice-expiry cases remain reproducible.

## Production gates

Production intake will not begin until all of the following are complete:

1. Formal consultation with Kumamoto Prefecture and agreement on the receipt process
2. Board approval by the selected certified NPO and confirmation of accounting, ownership, terms, and privacy policy
3. Confirmation of the funds-transfer-service JPYC contract on Polygon (chain ID `137`) and its JPYC EX redemption path
4. Agreement with a registered financial or payment provider covering the service, chain, and official JPYC
5. Multisignature, timelock, and key-management arrangements
6. Independent security audit and operational exercises
7. Responsibility allocation and a small end-to-end test under ADR-0008
8. Implementation, independent audit, and complete withdrawal exercise of the L1 escape hatch under ADR-0009
9. End-to-end testing of both Base and Polygon Vault/SBT deployments, global IDs, per-chain finality, unified aggregation, and Polygon halt/recovery operations
10. End-to-end testing under ADR-0011 of the Bitcoin multisig, independent-node threshold attestation, signed intent, Base SBT claim, and small conversion
11. Only when enabling Lightning: separate approval of the remote signer or external provider, restricted macaroons, hot-balance cap, recovery drills, and payment commitments
