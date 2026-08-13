# ADR-0011: Bitcoin・Lightning支援とBase玉垣SBT

- 状態: Proposed
- 日付: 2026-08-05
- 更新日: 2026-08-12

## 文脈

本システムの主要な存在理由は、国内銀行振込を置き換えることではなく、ブロックチェーンとスマートコントラクトを用いて国外から熊本への支援を受け付け、受付から円転、熊本県災害支援口座への入金、復興報告までを公開検証可能にすることにある。Bitcoinは世界的な保有・流通範囲が広い一方、BitcoinにはERC-721／ERC-5192と同等のSBT標準がなく、Native BTCの支払いとEVM上のSBTを同一transactionで原子的に発行できない。

Bitcoin inscriptionを譲渡不能な参加証明として扱う方法、tokenized BTCをBase Vaultで受け付ける方法、Native BitcoinまたはLightningの支払いを検証してBaseでSBTを発行する方法を比較した。

## 決定

### 1. 受付経路

- Native Bitcoin MainnetとLightning Networkを国外支援の候補経路に追加する。
- 初期本番のNative BitcoinはADR-0014に従い、国内登録VASPが管理する認定NPO専用受取口座で受領する。NPOはBitcoin秘密鍵を保持しない。
- 初期経路では、支援者が送金前に`route`、予定受領額、SBT受取先、公開metadata hash、有効期限、一回限りnonceを含むEIP-712 `SupportIntent`へ署名する。送金時点で未確定の`txid:vout`を支援者署名へ含めない。
- 支援者は送付元VASPが発行したtxidを送金後に提出する。検証者はその申告だけを信用せず、beneficiary VASPの認証済みAPI、署名済み明細または二者承認済み監査fileで`txid:vout`、実受領額、confirmation、compliance状態を照合する。txidを取得・照合できないVASP経路は自動SBT対象外とし、保留または手動例外審査とする。
- 将来NPOが直接受け入れるNative Bitcoinでは、支援IntentごとにHD walletから固有受取addressを導出する。初期VASP経路と混同しない。
- Lightningでは一回限りのinvoiceを支援Intentへ対応させ、公開global IDには`lightning:<network>:<domain-separated-payment-commitment>`を用いる。元のpayment hashを公開IDにせず、Keysendを標準受付経路にしない。
- tokenized／wrapped BTCはNative Bitcoinと明確に区別し、発行者、償還、bridge、登録事業者対応を別ADRで承認するまで「Bitcoin支援」として追加しない。

### 2. 支援者とSBT受取先の対応

- 正式なSBT受領の主要導線では、支援者は送金前にBase walletを接続し、route、予定satoshi額、Base受取address、公開玉垣metadata hash、有効期限、nonceを含むEIP-712支援Intentへ署名する。この署名は送金ではなくgasを消費せず、txidまたはvoutを含まない。
- 一回限りのBOLT 11 invoiceを署名済みIntentへ結び付け、支払い後に受取address、金額、玉垣内容を差し替えられないようにする。Lightning walletとBase walletは別であることをUIに明示する。
- Base walletを持たない支援者はSBTなしで支援できる。入金後に一回限りのClaim tokenで受取先を指定する経路は補助・復旧経路とし、token窃取、配送先本人性、再発行の運用を別途承認するまで標準導線にしない。
- BIP-322署名はBitcoin addressとBase addressの関連付けに利用できるが、過去の特定transactionを誰が送信したかの証明として単独使用しない。
- メール等でClaim tokenを配送する場合、連絡先と公開オンチェーンIDを分離し、tokenを平文保存しない。

### 3. Lightningユーザー体験

- 支援者にLNDの導入を要求しない。BOLT 11対応Lightning walletから、desktopではQR code、mobileでは`lightning:` deep linkまたはinvoiceコピーで支払えるようにする。
- 画面遷移を`資産選択 → satoshi額入力 → 玉垣編集 → Base wallet接続・Intent署名 → invoice確認 → Lightning wallet承認 → settled確認 → アテステーション → Base SBT Claim`とする。
- 支払直前にsatoshi額、参考法定通貨換算と換算時刻、invoice有効期限、支援先、walletが見積もるrouting feeを区別して表示する。routing feeを支援額へ含めない。
- 公開玉垣の表示名、国、message、金額公開設定はすべて任意とし、支払い前に単一の縦長玉垣previewで確認させる。入力は長さ・文字種を検証し、HTMLとして解釈しない。
- UI状態を`IntentCreated → InvoiceIssued → PaymentPending → Settled → Attesting → Claimable → SBTIssued`に分ける。支払い失敗、invoice期限切れ、SBT発行遅延を同じエラーにしない。
- Lightningには公開txidがないため、完了画面は支援番号、satoshi額、settled時刻、公開証明commitment、Base token ID／transactionを示す。payment hashとpreimageは公開しない。
- SBT Claimは事前署名したBase addressに限定し、支援者のBase gasを必須にしない限定Paymasterを利用できる。Claim失敗はsettled済み支援を取り消さず、安全に再試行可能にする。

### 4. 確認とアテステーション

- Bitcoin入金検出だけでは支援成立としない。初期VASP経路は`IntentCreated → TravelRuleAccepted / Held / Rejected → DepositDetected → Confirmed → ComplianceAccepted / Held / Rejected → SBTIssued → Converted → BankRemitted → Delivered → Reported`を分離する。コントラクトの`Accepted`は`ComplianceAccepted`に対応する。Lightningは`Settled → ComplianceReview → Accepted / Held / Rejected`を経て、AcceptedだけをSBT発行・確定集計へ進める。
- confirmation閾値は金額・再編成リスク・登録事業者要件に応じて定める。0-confirmationを確定支援、SBT発行、円転batchへ使用しない。
- Lightningはinvoiceがsettledであることをpayment hashと受領nodeで確認し、preimageを公開台帳へ直接保存しない。
- Baseの`BitcoinSupportRegistry`では、支援者署名済みIntentと、後から得られるtxidとvoutまたはdomain-separated payment commitment、実受領額、確認block heightまたはsettled時刻を含む検証者Attestationを分離する。AttestationはIntent hash、route、予定額と一致しなければならない。元のLightning payment hashは限定監査領域だけでcommitmentとの対応を保持する。
- Intentの有効期限はSBT発行transactionの時刻ではなく、検証者が署名する入金観測時刻へ適用する。期限内に送金された支援をVASP審査やconfirmation待ちの遅延だけで失効させない。
- 単一bridgeまたは単一backendの判断でSBTをmintしない。初期Native Bitcoinは、beneficiary VASPの認証済み入金記録とpublic chainの`txid:vout`を分離された検証組織が照合し、閾値アテステーションする。将来の直接受領は独立Bitcoin nodeで検証する。Lightningは限定証憑、payment commitment、append-only監査log、可能な場合は外部事業者記録を突合する。
- `txid:vout`およびpayment commitmentごとに有効な玉垣SBTを最大1枚とし、chain ID、Registry address、期限を署名domainへ含める。

### 4.1 集計の正本

- Bitcoin／Lightningの確定支援額と確定件数は、Base Registryの有効な`SupportAttested`を正本とする。Bitcoin取引検出、Lightning invoice `SETTLED`、`BitcoinTamagakiIssued`、ERC-721 mintは同じ支援の別状態であり、金額を再加算しない。
- `SupportInvalidated`後の記録は確定集計から除外するが、原記録、無効化理由、SBT状態を訂正履歴として残す。`Detected`／`Confirmed`／`PaymentPending`は確認中として別表示する。
- 支援件数は有効なglobal IDの件数であり、chain横断の人物数ではない。国別集計は任意申告だけを用いる。
- Native Bitcoinは`amount`をsatoshiとして`Σamount / 10^8 BTC`、Lightningはmillisatoshiとして`Σamount / 10^11 BTC`へ正規化する。統合画面のBitcoin行は両者のBTC量を合算し、Native／Lightning内訳とraw integerを併記する。
- 時系列には`observedAt`とBase登録block timeを保持する。Indexerは出典証憑と照合し、検証不一致時は新規確定反映を停止する。

### 5. 玉垣SBT

- Bitcoin／Lightning支援の正式な玉垣SBTはBase Mainnet上のERC-721＋ERC-5192として発行する。Bitcoin inscriptionを正式SBTにしない。
- Bitcoin支援では支払いとSBT発行が非原子的であることをUIに明示する。`Detected`または`Confirmed`段階の玉垣を発行済みSBTとして表示しない。
- 全体表示はBase ETH、Polygon JPYC、Bitcoin、Lightningを一つの玉垣景観へ統合するが、個別詳細に原資産、network、global ID、確認状態、アテステーション署名者集合を残す。
- SBT発行gasは対象method、上限、rate limitを拘束したPaymasterで負担できる。支援者にBase ETH保有を必須としない。

### 6. 鍵管理とBitcoin資金管理

- 初期本番では国内登録VASPがBTCをcustody・円転し、認定NPO、アプリケーション、DB、Indexer、公開WebはBitcoin private key、seed、xprvを保持しない。
- 以下のwatch-only Bitcoin Core、PSBT、認定NPO管理hardware multisig要件は、将来NPOが直接custodyする経路だけに適用する。単独walletやLNDを長期保管先にせず、署名者・閾値は法人決議とリスク評価で確定する。熊本県職員へ資金管理鍵を持たせない。
- 出金はserverが未署名PSBTを作成し、複数当事者がhardware walletの画面で送付先・金額・feeを確認して署名する。完成PSBTだけをwatch-only nodeからbroadcastする。
- EVM Vault管理、upgrade、送付先変更は単独EOAではなくhardware wallet署名者によるSafe型multisigとtimelockへ移管する。deploy用EOAの権限を本番開始前に除去する。
- 自動アテステーション鍵とPaymaster鍵はアプリserverのfileへ置かず、抽出不能なHSM/KMSで署名する。単一cloud accountでは成立しない閾値とし、資金移転権限を付与しない。
- Sweep、fee bump、PSBT署名、登録交換事業者への送金には四眼承認、日次・batch上限、送付先allowlist、少額先行送金を要求する。
- Bitcoin private key、xprv、seed、Lightning macaroon、preimageをEVM、公開Indexer、GitHub、ログへ保存しない。公開Webにはxpubも置かず、address derivationは分離された受入基盤で行う。
- 円転は対象業務と国外送信元に対応する登録交換・決済事業者へ委ね、認定NPOまたはDAOが利用者向け交換を行わない。

### 7. Lightningオンライン鍵の限定例外

- Lightning nodeはchannel状態を常時署名するため、「オンライン署名鍵をどこにも置かない」方針とは両立しない。初期production releaseはADR-0014の国内登録VASP経由Native Bitcoinのみを有効化し、NPO自己管理Bitcoin addressとLightning受付を既定で無効にする。
- Lightningを有効化するには、外部Lightning決済事業者またはremote signer／専用HSMを含む分離node構成、channel backup・復旧訓練、流動性・fee・障害監視、法務・会計確認を別途完了する。
- 例外承認後もWeb/APIへ`admin.macaroon`を配布しない。invoice serviceには`AddInvoice`、`LookupInvoice`、`SubscribeInvoices`相当だけの制約付きmacaroonを与え、Secrets Manager、接続元制限、監査log、rotationを適用する。
- LNDのonline channel keyはBitcoin長期保管multisig、EVM管理鍵、アテステーション鍵と兼用しない。Lightning hot balanceには金額・保管期限の上限を設け、超過分を固定allowlistのhardware multisigへsweepする。LND online keyの例外は長期保管要件を緩和しない。

### 8. 可観測性と縮退

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

Bitcoinの国際性とBaseのSBT・DAO機能を両立できる一方、VASP入金照合、cross-chainアテステーション、将来のBitcoin multisig、Lightning流動性という運用境界が生じる。Base側の`BitcoinSupportRegistry`はversion 2として、送金前Intentからsource evidenceを分離し、送金後Attestationへ`txid:vout`またはLightning commitmentを拘束する。検証者epoch付き閾値署名、evidence重複防止、Base SBT発行、無効化、pauseはプロトタイプ実装済みである。VASP API／署名済み明細との照合service、Paymaster、Indexer、UIは未実装である。将来経路のBitcoin Core watch-only受入、HD address導出、PSBT、LND invoice serviceも未実装であり、別個の開始承認まで実資金を受け付けない。

## プロトタイプ実装上の制約

- `BitcoinSupportRegistry`はBTCを保管・移転せず、公開証明とSBT発行だけを担当する。
- 支援者のversion 2 `SupportIntent`は`route`、予定`amount`、`recipient`、`publicMetadataHash`、`expiresAt`、`nonce`だけを含み、送金前に未知のsource evidenceを含めない。
- Bitcoinの検証者`Attestation`では`sourceId=txid`、`sourceIndex=vout`、`amount=satoshi`、`confirmationReference=block height`とする。
- Lightningでは`sourceId=domain-separated payment commitment`、`sourceIndex=0`、`amount=millisatoshi`、`confirmationReference=settled timestamp`とする。payment hashとpreimageは入力しない。
- 支援者署名と検証者署名はEIP-712 domainにBase chain IDとRegistry addressを含む。検証者集合を変更するとepochが増え、旧epochの未確定署名は使えない。
- 現行の検証者集合変更はadminによる即時操作であり、本番前にSafe型multisigとtimelockへ移管する必要がある。
- `Invalidated`は証跡とSBTを削除せず無効状態にする。使用済みoutpoint／commitmentを再発行可能には戻さない。
- 現行contractの状態は`None → Accepted → SBTIssued`を同一Base transaction内で進め、必要時に`Invalidated`へ変更する。設計上の`Detected`、`Confirmed`、Lightningの`PaymentPending`／`Settled`はオフチェーン受入・Indexer層の状態であり、現行Registryには永続化されない。したがってプロトタイプは状態遷移全体を実装済みとはみなさない。
- Registry contractが直接検証するのは支援者Intent、閾値署名、epoch、期限、一意性である。Bitcoin confirmation、Lightning settlement、`observedAt`の真実性は検証者とIndexerの責任であり、本番では独立証憑照合と監査が必要である。

## 関連ADR

- [ADR-0001](./0001-production-system-functional-spec.md): 本番機能仕様
- [ADR-0003](./0003-fund-governance-and-custody.md): 資金管理主体、署名者、閾値
- [ADR-0004](./0004-chain-sbt-and-attestation.md): マルチチェーンSBTとglobal ID
- [ADR-0006](./0006-security-boundaries-and-verifiable-batches.md): 資金境界と検証可能batch
- [ADR-0007](./0007-threat-model-and-human-error-controls.md): 攻撃・操作ミス対策
- [ADR-0008](./0008-certified-npo-joint-operation.md): 法的主体と登録事業者
- [ADR-0012](./0012-lightning-inbound-liquidity-and-channel-capital.md): Lightningのinbound liquidity、必要BTC、再調整、受付上限
- [ADR-0013](./0013-lightning-legal-classification-and-abuse-controls.md): Lightning寄附の法的分類、AML・制裁、不当勧誘、悪用防止
- [ADR-0014](./0014-trisa-centered-vasp-travel-rule-network.md): 登録VASPを受領窓口とする段階的Travel Rule対応
