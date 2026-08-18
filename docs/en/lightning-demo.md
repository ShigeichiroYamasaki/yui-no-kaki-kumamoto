# Local Lightning demo environment

This repository includes a local-only Docker Compose stack with one Bitcoin Core
`regtest` node, an Alice LND payer, and a Bob LND receiver. It uses valueless
regtest BTC and does not automatically submit settlements to Base Sepolia.

## Start the stack

```bash
npm run lightning:config
npm run lightning:up
```

Bitcoin Core and LND authenticate through a short-lived RPC cookie on a
read-only shared volume. The stack stores no static RPC password or `.env` file.

Create each LND wallet once with `lncli --network=regtest create`; use `unlock`
instead if the wallet already exists. Create or load the Bitcoin Core `miner`
wallet, mine 101 blocks, send regtest BTC to an Alice `p2wkh` address, and mine
six confirmations. Both nodes must report `synced_to_chain: true`.

Connect Alice to `${BOB_PUBKEY}@lnd-bob:9735`, open a 1,000,000 sat channel from
Alice, and mine six more blocks. Bob can then create a BOLT 11 invoice with
`addinvoice`; Alice decodes and pays it with `payinvoice`. The test passes when
Alice reports `SUCCEEDED` and Bob reports the invoice as `SETTLED`.

The complete copy-and-paste command sequence is maintained in the
[Japanese development guide](../lightning-demo). The Compose-specific boundary
and start/stop commands are also documented in
[`docker/bitcoin-lnd/README.md`](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/tree/main/docker/bitcoin-lnd).

## Security and integration boundary

Never reuse the stack's seeds, macaroons, addresses, channels, or coins on
Signet, testnet, or mainnet. The host ports bind to loopback and the service
network is internal. Automatic invoice subscription, public commitment
generation, threshold verification, `attestAndMint`, and indexing remain future
integration work. Never publish the invoice, preimage, payment hash, seed, or
macaroon to GitHub Pages or Base.
