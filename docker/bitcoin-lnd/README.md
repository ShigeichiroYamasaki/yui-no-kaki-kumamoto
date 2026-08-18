# Bitcoin Core / LND local demo

This Compose stack runs one Bitcoin Core `regtest` node and two isolated LND
wallets. Alice is the supporter and Bob is the receiving node. Every coin,
seed, macaroon, invoice, address, and channel created here is test-only.

It does not connect the settled invoice to Base Sepolia automatically. Registry
attestation and SBT minting remain a separate manual or Hardhat test step.

## Start

```bash
npm run lightning:config
npm run lightning:up
npm run lightning:logs
```

Create or unlock the Alice and Bob wallets with `lncli --network=regtest`, then
create or load the Bitcoin Core `miner` wallet. Generate 101 blocks, fund an
Alice `p2wkh` address, connect Alice to `lnd-bob:9735`, open a channel, generate
six more blocks, and pay a BOLT 11 invoice created by Bob. The full command
sequence and troubleshooting notes are in the
[whitepaper development guide](../../docs/lightning-demo.md).

## Stop

```bash
npm run lightning:down
```

Named volumes intentionally remain after `down`. Removing them destroys the
demo wallets, channels, macaroons, and regtest chain and is therefore not
provided as an npm command.

## Security boundary

- Never use mainnet, testnet, Signet, or real BTC with this stack.
- Bitcoin Core and LND authenticate with Bitcoin Core's short-lived RPC cookie;
  no static RPC password is stored in this repository.
- Never copy its seeds, macaroons, or wallet data to another environment.
- `admin.macaroon` is acceptable only for direct local development commands;
  a Web/API service must use a narrowly restricted macaroon.
- Host RPC/REST ports bind to loopback. The Compose network is internal.
