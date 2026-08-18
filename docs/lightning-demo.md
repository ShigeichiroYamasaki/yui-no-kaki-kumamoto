# ローカルLightningデモ環境

このページは、Docker Compose上のBitcoin Core `regtest`、支払側LND
`Alice`、受付側LND `Bob`でBOLT 11支払いを再現する手順です。実BTC、公開
testnet、Base Sepoliaへの自動送信は使用しません。

## 1. 起動

Docker DesktopまたはDocker EngineとCompose v2を用意します。

```bash
npm run lightning:config
npm run lightning:up
docker compose -f docker/bitcoin-lnd/compose.yml ps
```

Bitcoin CoreとLNDはnamed volume上の短期RPC cookieで認証します。固定RPC
パスワードや`.env`は使用しません。

## 2. LND walletの作成またはunlock

初回だけAliceとBobでwalletを作成します。

```bash
docker compose -f docker/bitcoin-lnd/compose.yml exec lnd-alice lncli --network=regtest create
docker compose -f docker/bitcoin-lnd/compose.yml exec lnd-bob lncli --network=regtest create
```

`wallet already exists`の場合は再作成せず、wallet作成時のパスワードでunlockします。

```bash
docker compose -f docker/bitcoin-lnd/compose.yml exec lnd-alice lncli --network=regtest unlock
docker compose -f docker/bitcoin-lnd/compose.yml exec lnd-bob lncli --network=regtest unlock
```

seedとパスワードはこのローカルデモだけに使用します。

## 3. miner walletと初期block

cookie認証を使うため、`bitcoin-cli`へRPCパスワードを再入力する必要はありません。

```bash
docker compose -f docker/bitcoin-lnd/compose.yml exec bitcoind bitcoin-cli -regtest createwallet miner
```

`Database already exists`の場合は次を使います。

```bash
docker compose -f docker/bitcoin-lnd/compose.yml exec bitcoind bitcoin-cli -regtest loadwallet miner
```

miner addressを取得し、coinbaseを使用可能にする101 blockを生成します。

```bash
MINER_ADDRESS="$(docker compose -f docker/bitcoin-lnd/compose.yml exec -T bitcoind bitcoin-cli -regtest -rpcwallet=miner getnewaddress | tr -d '\r\n')"
docker compose -f docker/bitcoin-lnd/compose.yml exec bitcoind bitcoin-cli -regtest -rpcwallet=miner generatetoaddress 101 "$MINER_ADDRESS"
```

## 4. 同期確認とAliceへの入金

両LNDの`getinfo`で`synced_to_chain: true`を確認します。

```bash
docker compose -f docker/bitcoin-lnd/compose.yml exec lnd-alice lncli --network=regtest getinfo
docker compose -f docker/bitcoin-lnd/compose.yml exec lnd-bob lncli --network=regtest getinfo
```

Aliceのaddressへ0.02 BTC相当の無価値なregtest BTCを送り、6 block生成します。

```bash
ALICE_ADDRESS="$(docker compose -f docker/bitcoin-lnd/compose.yml exec -T lnd-alice lncli --network=regtest newaddress p2wkh | sed -n 's/.*"address": *"\([^"]*\)".*/\1/p' | tr -d '\r\n')"
docker compose -f docker/bitcoin-lnd/compose.yml exec bitcoind bitcoin-cli -regtest -rpcwallet=miner sendtoaddress "$ALICE_ADDRESS" 0.02
docker compose -f docker/bitcoin-lnd/compose.yml exec bitcoind bitcoin-cli -regtest -rpcwallet=miner generatetoaddress 6 "$MINER_ADDRESS"
docker compose -f docker/bitcoin-lnd/compose.yml exec lnd-alice lncli --network=regtest walletbalance
```

## 5. peer接続とchannel開設

```bash
BOB_PUBKEY="$(docker compose -f docker/bitcoin-lnd/compose.yml exec -T lnd-bob lncli --network=regtest getinfo | sed -n 's/.*"identity_pubkey": *"\([^"]*\)".*/\1/p' | tr -d '\r\n')"
docker compose -f docker/bitcoin-lnd/compose.yml exec lnd-alice lncli --network=regtest connect "${BOB_PUBKEY}@lnd-bob:9735"
docker compose -f docker/bitcoin-lnd/compose.yml exec lnd-alice lncli --network=regtest openchannel --node_key="$BOB_PUBKEY" --local_amt=1000000
docker compose -f docker/bitcoin-lnd/compose.yml exec bitcoind bitcoin-cli -regtest -rpcwallet=miner generatetoaddress 6 "$MINER_ADDRESS"
docker compose -f docker/bitcoin-lnd/compose.yml exec lnd-alice lncli --network=regtest listchannels
```

`already connected to peer`は異常ではありません。channelが`active: true`になるまで
支払いへ進みません。

## 6. invoice支払い

Bobが10,000 satのinvoiceを作ります。`jq`が必要です。

```bash
PAYMENT_REQUEST="$(docker compose -f docker/bitcoin-lnd/compose.yml exec -T lnd-bob lncli --network=regtest addinvoice --amt=10000 --memo='Kumamoto Relief DAO demo' | jq -r '.payment_request')"
docker compose -f docker/bitcoin-lnd/compose.yml exec lnd-alice lncli --network=regtest decodepayreq "$PAYMENT_REQUEST"
docker compose -f docker/bitcoin-lnd/compose.yml exec lnd-alice lncli --network=regtest payinvoice --force "$PAYMENT_REQUEST"
docker compose -f docker/bitcoin-lnd/compose.yml exec lnd-bob lncli --network=regtest listinvoices
```

Alice側の`status: SUCCEEDED`とBob側の`state: SETTLED`が合格条件です。

## 7. 停止と再開

```bash
npm run lightning:down
npm run lightning:up
```

named volumeは停止後も残ります。LND再起動後にwalletがlockされていれば再度
`lncli unlock`します。データ削除はwallet、channel、macaroon、regtest chainを
失うため、自動コマンドを提供しません。

## 8. Base Sepoliaとの境界

このComposeは`SETTLED`までを確認します。invoice購読、公開用payment
commitment生成、独立検証者の閾値署名、Base Sepolia
`BitcoinSupportRegistry`への`attestAndMint`、公開Indexer反映はまだ自動化されて
いません。invoice全文、preimage、payment hash、seed、macaroonをGitHub Pagesや
Baseへ送信しません。
