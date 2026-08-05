# ADR-0011: Bitcoin・Lightning支援とBase玉垣SBT

- 状態: Proposed
- 日付: 2026-08-05

## 文脈

本システムの主要な存在理由は、国内銀行振込を置き換えることではなく、ブロックチェーンとスマートコントラクトを用いて国外から熊本への支援を受け付け、受付から円転、熊本県災害支援口座への入金、復興報告までを公開検証可能にすることにある。Bitcoinは世界的な保有・流通範囲が広い一方、BitcoinにはERC-721／ERC-5192と同等のSBT標準がなく、Native BTCの支払いとEVM上のSBTを同一transactionで原子的に発行できない。

Bitcoin inscriptionを譲渡不能な参加証明として扱う方法、tokenized BTCをBase Vaultで受け付ける方法、Native BitcoinまたはLightningの支払いを検証してBaseでSBTを発行する方法を比較した。

## 決定

### 1. 受付経路

- Native Bitcoin MainnetとLightning Networkを国外支援の候補経路に追加する。
- Native Bitcoinでは支援IntentごとにHD walletから固有受取addressを導出し、`bitcoin:<network>:<txid>:<vout>`を支援global IDとする。addressを複数支援者で共用しない。
- Lightningでは一回限りのinvoiceを支援Intentへ対応させ、`lightning:<network>:<paymentHash>`を支援global IDとする。Keysendを標準受付経路にしない。
- tokenized／wrapped BTCはNative Bitcoinと明確に区別し、発行者、償還、bridge、登録事業者対応を別ADRで承認するまで「Bitcoin支援」として追加しない。

### 2. 支援者とSBT受取先の対応

- 支援者は送金前にBase addressを指定するか、入金確認後に一回限りのClaim tokenでBase addressを指定する。
- BIP-322署名はBitcoin addressとBase addressの関連付けに利用できるが、過去の特定transactionを誰が送信したかの証明として単独使用しない。
- メール等でClaim tokenを配送する場合、連絡先と公開オンチェーンIDを分離し、tokenを平文保存しない。

### 3. 確認とアテステーション

- Bitcoin入金検出だけでは支援成立としない。`Detected → Confirmed → Accepted → SBTIssued → Included → Converted → Delivered → Reported`の状態を分離する。
- confirmation閾値は金額・再編成リスク・登録事業者要件に応じて定める。0-confirmationを確定支援、SBT発行、円転batchへ使用しない。
- Lightningはinvoiceがsettledであることをpayment hashと受領nodeで確認し、preimageを公開台帳へ直接保存しない。
- Baseの`BitcoinSupportRegistry`へ、支援ID、txidとvoutまたはpayment hash、satoshi／millisatoshi額、確認block heightまたはsettled時刻、SBT受取先、公開metadata hash、状態を登録する。
- 単一bridgeまたは単一backendの判断でSBTをmintしない。認定NPO、技術運営者、独立監査・監視者等の独立Bitcoin nodeによる閾値アテステーションを要求する。
- `txid:vout`および`paymentHash`ごとに有効な玉垣SBTを最大1枚とし、chain ID、Registry address、期限を署名domainへ含める。

### 4. 玉垣SBT

- Bitcoin／Lightning支援の正式な玉垣SBTはBase Mainnet上のERC-721＋ERC-5192として発行する。Bitcoin inscriptionを正式SBTにしない。
- Bitcoin支援では支払いとSBT発行が非原子的であることをUIに明示する。`Detected`または`Confirmed`段階の玉垣を発行済みSBTとして表示しない。
- 全体表示はBase ETH、Polygon JPYC、Bitcoin、Lightningを一つの玉垣景観へ統合するが、個別詳細に原資産、network、global ID、確認状態、アテステーション署名者集合を残す。
- SBT発行gasは対象method、上限、rate limitを拘束したPaymasterで負担できる。支援者にBase ETH保有を必須としない。

### 5. Bitcoin資金管理

- Bitcoin受取walletと長期保管・円転walletを分離し、認定NPOの複数hardware walletによるBitcoin multisigを用いる。
- Sweep、fee bump、PSBT署名、登録交換事業者への送金には四眼承認、日次・batch上限、送付先allowlist、少額先行送金を要求する。
- Bitcoin private key、xprv、seed、Lightning macaroon、preimageをEVM、公開Indexer、GitHub、ログへ保存しない。公開Webにはxpubも置かず、address derivationは分離された受入基盤で行う。
- 円転は対象業務と国外送信元に対応する登録交換・決済事業者へ委ね、認定NPOまたはDAOが利用者向け交換を行わない。

### 6. 可観測性と縮退

- Bitcoin Core node、独立provider、Lightning node、Base Registry、SBT Indexerを別々に監視する。
- BitcoinまたはLightning監視が不一致のときは新規SBT発行とbatch組入れを停止するが、既存の公開証跡を削除しない。
- 公開画面は`検出済み`、`Bitcoin確認済み`、`審査済み`、`SBT発行済み`、`円転済み`、`県送金済み`を区別し、最後に合意したBitcoin block heightとBase blockを表示する。

## 却下した案

### Bitcoin inscriptionを正式SBTにする

inscriptionを含むUTXOは移転可能であり、共通の譲渡不能標準、wallet表示、状態更新、DAO資格確認が不足するため採用しない。将来の任意記念物は正式な玉垣SBTと分離する。

### wrapped BTCだけを受付対象にする

EVM内で原子的にSBTを発行できるが、Bitcoin Mainnetから直接支援したい国外利用者を取り込めず、発行者・bridge・償還の追加リスクがあるためNative BTCの代替にしない。

### 単一Oracleで即時mintする

誤検出、侵害、再編成、二重発行の影響が単一点へ集中するため採用しない。

## 結果

Bitcoinの国際性とBaseのSBT・DAO機能を両立できる一方、cross-chainアテステーション、Bitcoin multisig、Lightning流動性、登録事業者対応という新しい運用境界が生じる。現行コントラクトとデモは本ADRを未実装であり、SignetまたはBitcoin testnet、Lightning test環境、Base Sepoliaを用いた端間試験、外部監査、少額円転試験が完了するまで実資金を受け付けない。

## 関連ADR

- [ADR-0001](./0001-production-system-functional-spec.md): 本番機能仕様
- [ADR-0004](./0004-chain-sbt-and-attestation.md): マルチチェーンSBTとglobal ID
- [ADR-0006](./0006-security-boundaries-and-verifiable-batches.md): 資金境界と検証可能batch
- [ADR-0007](./0007-threat-model-and-human-error-controls.md): 攻撃・操作ミス対策
- [ADR-0008](./0008-certified-npo-joint-operation.md): 法的主体と登録事業者
