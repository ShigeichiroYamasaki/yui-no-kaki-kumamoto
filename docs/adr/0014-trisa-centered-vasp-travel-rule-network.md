# ADR-0014: 登録VASPを受領窓口とする段階的Travel Rule対応

- 状態: Proposed
- 日付: 2026-08-13

## 注意

本ADRは技術・運用設計であり、Travel Ruleの適用範囲、通知項目、対象法域、閾値、保存期間または登録要否についての法的助言ではない。対象法域と制度は変更され得るため、本番開始時点の法令、金融庁資料、JVCEA規則、契約VASPの手順を法律専門家と再確認する。

## 文脈

国外のVASP口座からBitcoin／Lightningで支援する場合、originator VASPとbeneficiary VASPの間でTravel Rule情報の通知が必要となり得る。一方、支援者の自己管理wallet、NPOのLND、NPOのBitcoin hardware multisigはアンホステッドwalletに該当し得るため、全経路を一律にVASP間通知として扱うことはできない。

TRISA（Travel Rule Information Sharing Architecture）は、VASP間でTravel Rule情報を交換するためのoverlay networkである。Global Directory ServiceによるVASP discoveryと証明書、mTLSによる相互認証、gRPC、暗号化されたSecure Envelope、IVMS101形式を中心に構成される。TRISAはBitcoin／Lightning transactionを実行せず、LND settlement、資金源、本人性または各法域での法令遵守を自動的に保証しない。

本システムの認定NPO、DAO、公開Webを無登録VASPとして動作させず、必要なTravel Rule処理は登録VASPの責任領域へ置く必要がある。

## 決定

### 0. 初期本番の最小構成

初期本番では、認定NPOがBitcoinを直接custodyせず、**国内登録VASPが管理する認定NPO専用受取口座**をBitcoinの受領、Travel Rule、AML／CFT、制裁審査、円転の境界とする。通常の法人口座を流用せず、不特定多数の国外支援者からの寄附受領を許容することをVASPと書面で合意する。

- 対象資産はNative Bitcoinのon-chain送金に限定する。Lightning、NPO管理LND、NPO自己管理Bitcoin addressは初期本番では無効とする。
- 標準経路は`国外支援者 → originator VASP → 国内beneficiary VASPのNPO専用口座 → 円転 → NPO銀行口座`とする。
- originator VASPからの入金は、beneficiary VASPが適用法域、閾値、相互運用可能なprotocolに基づいてTravel Rule情報を受信・審査する。
- 自己管理walletからの入金は自動的にTravel Rule対応済みとせず、初期本番では拒否または保留する。将来受け入れる場合は、契約VASPのunhosted-wallet手順と別個の開始承認を必須とする。
- 認定NPOと本システムはTRISA node、GDS production certificate、KYC資料または暗号資産秘密鍵を保持しない。TRISA、Sygnaその他のnetwork選択と相互運用は契約VASPの責任範囲とする。
- VASPが提供する認証済みAPI、webhook、署名済みfileまたは二者承認可能な明細により、VASP transaction ID、`txid:vout`、asset、実受領額、受領時刻、compliance状態を照合する。支援者が提出したtxidやメールだけを確定根拠にしない。この粒度の照合データを得られないVASPは自動SBT経路に採用しない。
- VASPが`ComplianceAccepted`とした入金だけを確定集計とSBT発行へ進める。Travel RuleのPIIは本システムへ取り込まず、公開chainにも記録しない。
- VASPは承認済みBTCを円転し、認定NPO名義の国内銀行口座へ送金する。初期本番ではNPO Bitcoin hardware multisigへのwithdrawalを通常フローに含めない。

この構成に必要な契約条件は、NPO法人名義口座、不特定多数からの国外寄附、Bitcoin入金、対応送信元VASP・法域・protocol、情報不足時の保留／拒否／返金、APIまたは明細、円転、銀行送金、手数料、障害・契約終了時の処理である。公開された一般向け法人口座条件だけで対応可能と判断しない。

### 1. 責任主体

- 初期本番では、Travel Ruleのoriginator／beneficiary VASPとしての判断、顧客確認、通知、受信、審査、保存、届出に加え、BTC custody、円転、NPO銀行口座への送金を、対象業務を行える国内登録VASPへ委ねる。
- 認定NPO、DAO、LND intake service、Bitcoin verifier、Base Registry、Indexer、GitHub PagesはVASPを名乗らず、TRISA certificateを借用しない。
- TRISA Envoyまたは同等nodeは、契約VASP自身、またはVASPの統制・監査下にある委託先compliance domainへ置く。公開Web、LND、Indexerと同じtrust boundaryへ置かない。
- 契約には、どちらがTravel Rule法定義務者か、KYC／CDD、制裁screening、疑わしい取引届出、データ主体対応、侵害通知、保存・削除、再委託、越境移転、監査権を明記する。

### 2. 経路分類

各支援または資金移転を、送信前に次のいずれかへ分類する。

| 経路 | Travel Rule上の扱い | TRISAの役割 |
|---|---|---|
| Originator VASP → beneficiary VASPが管理するNPO受取口座／Lightning受付 | VASP間移転。対象法域・閾値・資産等に応じ通知を判断 | 優先する情報交換network。送金前にcounterparty discovery、情報交換、accept／rejectを行う |
| 自己管理Lightning wallet → NPO管理LND | アンホステッドwalletからの直接支援。通常のVASP間通知と同一ではない | 存在しないoriginator VASPの情報を生成しない。契約VASPのunhosted-wallet risk controlへ引き継ぐ |
| 自己管理Bitcoin wallet → NPO hardware multisig | アンホステッドwallet間またはNPO自己管理walletへの受領 | TRISA対象済みとは表示しない。chain analysis、任意申告、case reviewを別に行う |
| NPO LND／hardware multisig → 円転VASP | NPOのアンホステッドwalletからVASPへの入金 | beneficiary VASPのunhosted-wallet手順に従う。TRISAだけで送信者確認を代替しない |
| 円転VASP → 別VASP | VASP間移転となる場合がある | 双方が対応するときTRISAで必要情報を交換する |
| 同一VASP内のNPO口座で受領・円転 | 内部振替・交換としてVASPが分類 | 外部TRISA messageの要否はVASP判断。内部KYC・監査記録を省略しない |

### 3. 優先構成と将来拡張

- 初期本番では、登録VASPが管理するNPO専用Bitcoin受取口座だけをbeneficiary endpointとする。Lightning受付serviceは将来拡張とする。
- 支援者VASPとbeneficiary VASPがTRISAに対応している場合、資金移転前にTRISA exchangeを完了し、Travel Rule情報が受理された後にBitcoin支払いへ進む。これは資金またはAML審査の最終受入を意味しない。
- TRISA非対応VASPには、契約VASPが承認するinteroperability経路（TRP等）または人手を含む安全な代替手順を使用する。通常のemail、公開form、URL queryへPIIを載せない。
- Travel Rule交換が失敗、pending、repair requested、rejectedの場合、invoice発行または資金利用を保留する。TRISA障害を理由に直接LNDへ迂回して統制を回避しない。
- 自己管理walletからの支援は初期本番では拒否または保留する。将来の別経路として有効化する場合も、Travel Rule通知済みとは表示せず、VASPのアンホステッドwallet審査を経て`Accepted`とする。

### 4. Travel Rule network実装

- 初期本番ではNPOまたは技術受託者によるTRISA Envoyのself-hosted deploymentを行わない。契約VASPがTRISA、Sygnaその他の承認済みnetworkとmanual fallbackを選定・運用する。
- 以下は契約VASPがTRISAを採用する場合だけ適用する。VASPはGlobal Directory Serviceへ登録し、TRIXO情報とVASP Identity Certificateを管理し、testnetとproductionを分離する。
- TRISA採用時はcounterpartyをGDSで発見し、certificate chain、失効、legal name、jurisdiction、license／registration、endpointを確認する。mTLS、Secure Envelope、IVMS101を用い、Envoy権限とcertificate／sealing keyをVASPのcompliance boundaryで管理する。NPOまたは公開Webへ鍵やPIIを渡さない。
- message ID、内部support ID、VASP transaction ID、Lightning公開commitmentまたはBitcoin outpointの対応は限定監査DBだけに保持する。payment hash、preimage、IVMS101 PIIを公開Indexerへ渡さない。

### 5. 状態モデル

VASP関与経路は次の状態を追加する。

`IntentCreated → CounterpartyDiscovered → TravelRulePrepared → TravelRuleAccepted / RepairRequested / Rejected → DepositDetected → Confirmed → ComplianceAccepted / Held / Rejected → SBTIssued → Converted → BankRemitted`

- `TravelRuleAccepted`は相手VASPが情報交換を受理した状態であり、Lightning決済完了または寄附受領を意味しない。
- `Settled`だけではTravel Rule、AML／CFT、制裁審査の完了を意味しない。
- `ComplianceAccepted`だけを確定集計、SBT発行、登録VASPでの円転へ進める。将来の直接custody経路だけhardware multisigを使用する。
- repair、reject、timeout、certificate失効、counterparty不一致を一つの一般エラーへ潰さず、運用担当だけに必要最小限の理由を表示する。

### 6. データ最小化と保存

- TRISAで交換する項目は、適用法令と契約VASPが必要と判断したoriginator／beneficiary情報に限定する。「念のため」に公開プロフィールやSBT metadataを本人確認情報へ結合しない。
- Secure Envelopeは暗号化状態で保存し、unsealing keyを分離する。保存期間は法令・VASP規程・訴訟holdに基づき確定し、終了後は暗号鍵破棄を含む検証可能な削除を行う。
- Travel Rule PII、KYC資料、制裁hit、疑わしい取引情報をon-chain、Git、通常application log、analytics、support ticketへ記録しない。
- 国外VASPとの情報交換では個人データの越境移転、委託、本人開示・訂正、漏えい通知をプライバシー規程とDPAで処理する。
- 公開画面には`VASP経由`、`自己管理wallet経由`等の経路分類と審査状態だけを表示し、VASP名や本人情報を本人の同意・法的根拠なく公開しない。

### 7. 将来のhardware multisigとの整合

- 初期本番はVASP内でBTCを円転してNPO銀行口座へ送金し、hardware multisigへのwithdrawalを通常経路にしない。
- 将来、NPO直接custodyを別途承認した場合だけ、円転しないAccepted BTCを認定NPO管理のBitcoin hardware multisigへwithdrawする。
- VASPからNPO hardware multisigへの出金はアンホステッドwallet向け手順、address ownership確認、制裁審査、二者承認、固定allowlist、少額先行を要求する。TRISA messageだけでaddress ownershipを証明したとはみなさない。
- NPO multisigからVASPへ戻す際も、VASPのアンホステッドwallet入金手順に従い、PSBT、outpoint、法人口座、support batchを照合する。

### 8. 障害・悪用対策

| リスク | 必須対策 |
|---|---|
| 偽VASP／偽endpointへのPII送信 | 契約先endpointの別経路照合。TRISA採用時はGDS discovery、mTLS、certificate失効確認、KYV |
| Travel Rule情報と実際のinvoice／outpointの差替え | support ID、asset、amount、network、beneficiary account、commitmentを限定DBで拘束し、送金前後に照合 |
| TRISAを通ったことを資金の合法性保証として悪用 | TRISA acceptanceとAML／制裁risk decisionを別状態・別承認にする |
| アンホステッドwalletを架空VASPとして登録 | counterparty種別を明示し、GDS未確認主体へVASP statusを付与しない |
| PII漏えい | 最小化、Secure Envelope、鍵分離、RBAC、監査log、DLP、保存期限、侵害訓練 |
| certificate／sealing key侵害 | HSM/KMS、rotation、失効、test／production分離、緊急停止、counterparty通知 |
| protocol非対応を理由とする統制迂回 | 承認済みinteroperability／manual procedureだけを許可し、直接送金への自動fallbackを禁止 |
| NPOまたは技術受託者が無登録VASP機能を実施 | VASP責任境界、API権限、契約、監査、機能テストで交換・custody・第三者移転を禁止 |

## 本番開始ゲート

1. 対象経路ごとのVASP間／アンホステッドwallet分類と日本法の法律意見
2. 対象業務を行える登録VASPとの契約と責任分界
3. 契約VASPの対応Travel Rule network、対象counterparty・法域・資産、相互運用不能時の保留／拒否手順の確認。TRISA採用時だけGDS production certificate、TRIXO、endpoint、失効手順を確認
4. IVMS101 mapping、data minimization、DPA、越境移転、保存・削除規程
5. testnet上のAccepted、RepairRequested、Rejected、timeout、certificate失効の端間試験
6. Travel Rule recordとLightning invoice／Bitcoin outpoint／support IDの照合試験
7. TRISA／TRP非対応counterpartyとアンホステッドwalletの縮退・保留手順
8. VASP custody上限、円転、NPO銀行口座への送金、照合明細、返金、VASP停止時の資産返還手順の試験
9. PII漏えい、偽VASP、certificate侵害、VASP停止、規制照会を含む訓練

一つでも未完了の場合、Bitcoin本番受付を開始しない。Lightning、自己管理wallet、NPO hardware multisigは、それぞれ別個の開始承認を得るまで有効化しない。TRISA対応の有無だけをもってVASP選定または適法性判断を完了しない。

## 結果

初期本番を国内登録VASPのNPO専用受取口座へ限定することで、NPOは暗号資産秘密鍵、LND流動性、TRISA node、Travel Rule PIIを保持せずに国外Bitcoin支援を開始できる。一方、対応VASP・法域の範囲、第三者寄附を許容する契約、入金照合API、保留・返金が必要となる。TRISAは選択肢の一つとして登録VASPのcompliance planeへ限定し、公開SBT、Base Registry、DAOから分離する。

## 一次資料

- [TRISA Developer Documentation](https://trisa.dev/)
- [TRISA Getting Started](https://trisa.dev/getting-started/)
- [TRISA Global Directory Service](https://trisa.dev/gds/)
- [TRISA Envoy API](https://trisa.dev/envoy/api/)
- [TRISA Best Practices](https://trisa.dev/reference/best-practices/)
- [金融庁：暗号資産・電子決済手段の移転に係る通知義務](https://www.fsa.go.jp/news/r4/sonota/20230526-2/00.pdf)
- [JVCEA：暗号資産交換業に係るAML/CFT規則](https://jvcea.or.jp/cms/wp-content/themes/jvcea/images/pdf/1301.pdf)

## 関連ADR

- [ADR-0008](./0008-certified-npo-joint-operation.md): 認定NPOと登録事業者の責任分界
- [ADR-0011](./0011-bitcoin-lightning-and-base-sbt.md): Bitcoin・Lightning受付
- [ADR-0012](./0012-lightning-inbound-liquidity-and-channel-capital.md): Lightning流動性
- [ADR-0013](./0013-lightning-legal-classification-and-abuse-controls.md): Lightningの法的分類・AML・制裁
