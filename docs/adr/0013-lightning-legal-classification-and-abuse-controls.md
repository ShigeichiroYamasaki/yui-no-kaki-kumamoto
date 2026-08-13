# ADR-0013: Lightning寄附受付の法的分類と悪用防止

- 状態: Proposed
- 日付: 2026-08-12

## 注意

本ADRは2026年8月12日時点の公開一次資料に基づく設計上の論点整理であり、法的助言または適法性の保証ではない。最終判断は、具体的な法人、契約、資金・鍵の帰属、Lightning channel構成、表示、返金、円転経路を確定した上で、日本法に詳しい弁護士、登録暗号資産交換業者、所管財務局・金融庁、必要に応じて警察・財務省へ確認する。

## 文脈

Lightningは国外から小額BTCを迅速に受け取れる一方、公開chainだけでは支払者、経路、settlementを完全に再現できない。LNDはonline keyと流動性を持ち、invoice発行、転送、払戻し、円転を同じサービスへ混在させると、単なる自己勘定の寄附受領から、他人の暗号資産管理、交換・媒介、送金類似サービスへ実質が変わり得る。

資金決済法上、暗号資産の売買・交換、その媒介等、または他人のための暗号資産管理を業として行う場合は登録問題が生じる。金融庁は、利用者の関与なく暗号資産を移転できる秘密鍵を保持して他人の資産を主体的に移転し得る場合、基本的にカストディとして登録が必要になるとの考え方を示している。2026年6月1日には、所属する登録業者の委託を受けて売買・交換の媒介だけを行う電子決済手段・暗号資産サービス仲介業制度も開始されたが、これは無登録で自由に仲介できる制度ではない。

一方、認定NPOが自らへの取消不能な寄附としてBTCを受領し、支援者別残高、交換、送金、預り、換金請求権を提供しない構成が直ちに暗号資産交換業へ該当するとは限らない。ただし「寄附」という名称ではなく実態で個別判断され、Lightning nodeのルーティング、返金、共同保管、運営受託者の鍵権限によって結論が変わるため、包括的な適法宣言はしない。

## 決定

### 1. 初期本番の法的境界

- LightningはADR-0011・0012・本ADRの開始条件が全て満たされるまで無効とする。
- 受領主体を契約上も会計上も認定NPOとし、settlement時点でBTCをNPOへ確定帰属させる。システム、技術受託者、DAO、検証者は支援者のBTC残高を持たない。
- 一回限りのinvoiceはNPOへの寄附請求だけに用い、商品代金、第三者送金、両替、立替、エスクロー、支援者間移転を提供しない。
- 支援者へBTC・円・JPYCの払戻請求権、換金権、収益分配、SBT換金価値を与えない。玉垣SBTは譲渡不能な参加証明であり、金銭的権利を表さない。
- コントラクト、LND、DAOが交換を行わず、NPO自身のBTC円転は登録済み事業者との法人取引として分離する。
- 技術受託者へNPO資産を単独移転できる権限を与えない。LND online keyの例外は、NPOの統制下にある隔離環境、remote signerまたは適格な外部事業者、hot上限、監査、sweep先固定に限定する。
- LightningでAcceptedとなったBTCの長期保管先は、ADR-0011で定める認定NPO管理のBitcoin hardware multisigを必須とする。単独EOA、単独hardware wallet、LND walletを長期保管先として認めない。具体的な署名者と閾値は法人決議とリスク評価で確定するが、複数の独立したhardware wallet署名を必要とする。
- LNDには理事会承認済みの有限なhot balanceとchannel運用資金だけを保持する。上限超過分と保管期限超過分は、固定allowlistに登録したhardware multisig addressへ、承認済みLoop Outまたはsweep手順で移す。任意addressへの自動sweepを禁止する。

### 2. Lightningルーティングとchannel

- 初期運用では受付nodeを一般公衆向けルーティング事業として宣伝せず、第三者間支払いの転送とrouting fee収益を事業目的にしない。
- 可能な限りprivate channel、受領専用channelまたは契約したLightning service providerを使用し、意図しないforwardingを計測・制限する。
- 公開routing nodeを運営する場合は、他人の暗号資産管理・移転、交換業、犯罪収益移転防止法、外為法、税務・会計上の評価を別ADRと法律意見で再承認する。
- channel開設資金、inbound liquidity、Loop Out、swap、submarine swapは、誰の資産を誰のために移すのかを契約と台帳で明確にする。支援者のための交換・移転をNPOが代行しない。

### 3. AML/CFT、制裁、犯罪収益

- NPOが直ちに犯罪収益移転防止法上の暗号資産交換業者に該当しない場合でも、リスクベースの受入規程、制裁screening、取引monitoring、記録保存、凍結・返金・当局相談手順を自主統制として設ける。
- 登録交換業者による円転時には、取引時確認、資金源説明、unhosted wallet対応、トラベルルールその他の事業者要件に従う。直接寄附時に取得していない送付者情報を、後から完全に復元できるとは表示しない。
- 外為法上の資産凍結・支払規制は暗号資産を含み、制裁対象者との支払・支払受領には許可が問題となり得る。制裁候補、ransomware、詐欺、盗難、制裁回避に関連するrisk signalがある場合は、自動円転・sweep・SBT発行・県送金batch組入れを停止し、法律専門家、登録事業者、必要な当局へ判断をエスカレーションする。
- 疑わしい取引の法定届出義務者と届出先は、実際の運営主体・登録区分ごとに確認する。NPOが法定の特定事業者でないことだけを理由に、登録事業者への情報提供や捜査照会対応を拒まない。
- blockchain analyticsは単独で違法性を断定するものではない。誤検知、匿名性、越境データ移転、個人情報保護を考慮し、人による再確認と異議申立て経路を設ける。

### 4. 防御目的の悪用類型

以下は犯罪を実行するための手順ではなく、検知・停止・証拠保全のための脅威モデルである。具体的な回避方法、閾値、vendor ruleは公開しない。

| ID | 悪用類型 | 観測し得る兆候 | 必須統制 |
|---|---|---|---|
| L-01 | 詐欺、恐喝、ransomware、盗難由来BTCを寄附へ混入して正当な資金に見せる | 高risk sourceとの近接、通常と異なる集中入金、説明不能な高額 | risk scoring、人手review、保留台帳、円転・SBT・batch停止、証拠保全、事業者・専門家への照会 |
| L-02 | 寄附後に別walletや銀行口座への返金を求め、資金源を切り離す | 送金直後の緊急返金、第三者宛て指定、過払いを繰り返す | 原則返金なし。法的に必要な例外は元の資金経路または登録事業者経由、二者承認、SBT無効化、完全な監査log |
| L-03 | 多数wallet・小額invoiceへ分割し、reviewや上限を回避する | 時間・金額・metadata・network特徴が連動する反復 | 単発額だけでなく累積・関連性でmonitoringし、内部閾値を非公開化、invoice発行rate limit、case単位review |
| L-04 | 制裁対象者が仲介者、第三国、複数hopを介して直接関係を隠す | 制裁risk signal、説明とchain evidenceの不一致、関係addressの反復 | 制裁list更新、chain analyticsと法人情報の複合確認、許可判断まで資金移転停止、外為法専門家への照会 |
| L-05 | 受付API、QR、DNSを改ざんして偽invoiceへ誘導する | Intentとinvoice amount・宛先・commitment不一致、証明書・release変更 | invoiceを署名済みIntentへ拘束、公式domain・release署名、out-of-band公式address、CSP、監視、緊急停止 |
| L-06 | 架空settlementを作りSBT、支援件数、信用を水増しする | LND記録、provider記録、Registry attestationの不一致 | 限定証憑、append-only log、独立検証組織、同一情報源riskの監査、不一致時mint停止 |
| L-07 | 自己寄附やSybil walletで玉垣数・参考投票を操作する | 同時刻・同metadata・資金源の強い相関、極小額の反復 | 最小受入額、rate limit、異常表示の注記、投票を非拘束のまま維持、人数ではなく支援ID件数と表示 |
| L-08 | LNDの一般routing機能を第三者資金移転や規制回避へ利用する | 寄附invoiceと無関係なforwarding、routing fee・channel flowの急増 | 初期は受領専用・非公開channelを優先、forwarding監視・制限、一般routing開始を別審査 |
| L-09 | 災害・熊本県・認定NPOとの関係を偽装して寄附を勧誘する | 非公式domain、偽ロゴ、未承認の「県公認」「控除対象」表示 | 複数公式経路で照合可能な公告、商標・domain監視、受付開始前表示、通報窓口、虚偽表示の即時停止 |
| L-10 | 個人を困惑させる勧誘、取消不能性や手数料を隠した勧誘 | 緊急性を過度に煽る表示、退出妨害、誤認させる税制・返礼説明 | 不当寄附勧誘防止法を前提に任意性、取消不能性、手数料、SBTの無価値性、運営主体を送金前に明示し、dark patternを禁止 |

### 5. 保留、拒否、返金、SBT

- `SETTLED`は技術的受領を表すが、直ちに`Accepted`、SBT発行、円転可能を意味しない。`Settled → ComplianceReview → Accepted / Held / Rejected`をオフチェーン状態として追加する。
- 法的根拠なく受領済みBTCを没収・転用しない。保留・返金・当局対応は案件別の法律判断と登録事業者の指示に従う。
- 保留中は確定支援額、公開支援者数、参考投票資格へ含めない。公開画面は個人を犯罪者と断定せず「確認中」とだけ表示する。
- Accepted後に重大事実が判明した場合は`SupportInvalidated`で集計・SBT資格を無効化し、元証跡を削除せず訂正理由を必要最小限で公開する。
- 返金が許可された場合は、新規送金先を自由入力させず、元経路への復帰可能性、制裁、手数料、会計、SBT無効化を二者承認する。返金を通常機能または即時保証として広告しない。

### 6. 寄附勧誘・表示・プライバシー

- 運営主体、資金帰属、使途、手数料、円転、熊本県との関係、税制優遇なし、SBTの非金融性、取消不能性、Lightningの障害・流動性riskを送金前に表示する。
- 「熊本県公認」「県へ直接暗号資産寄附」「必ず全額届く」「匿名で追跡不能」など、事実または契約で裏付けられない表示を禁止する。
- 法人等による寄附の不当な勧誘の防止等に関する法律の配慮義務・禁止行為をUI、広告、SNS、対面説明にも適用し、過度な不安喚起、退出妨害、判断力低下への乗じ、借入・生活資産処分の要求を行わない。
- 国、nickname、messageは任意とし、AML記録と公開プロフィールを分離する。payment hash、preimage、IP address、本人確認資料を公開Registryへ載せない。

## 本番開始ゲート

Lightning受付は、次の証拠を理事会と共同運営会議が承認するまで開始しない。

1. 確定した業務・鍵・資金フローに対する日本法の法律意見
2. 所管財務局・金融庁への事前相談要否と、その回答または相談記録
3. 登録交換業者・Lightning providerとの契約、円転可否、ADR-0014に基づくVASP間通知、unhosted wallet・制裁対応
4. 受領主体、会計認識時点、返金・保留・没収不能時の処理を定めた規程
5. AML/CFT・制裁risk assessment、case管理、証拠保全、当局照会・届出責任者
6. 不当寄附勧誘、広告、利用規約、プライバシー、苦情・異議申立ての法務review
7. 受領専用channelまたは外部provider構成と、一般routingを行わないことの技術検証
8. 認定NPO管理のBitcoin hardware multisig、署名者・閾値・二拠点backup、固定sweep先、PSBT四眼承認の法人決議と復旧試験
9. 少額端間試験、異常入金、保留、返金例外、SBT無効化、円転拒否、LND侵害、multisig署名者喪失を含む訓練

一項でも未完了、または登録要否が未解決なら、Lightningを無効のままNative Bitcoinまたは既存の適法な支援経路へ案内する。

## 結果

自己勘定の寄附受領へ機能を限定することで交換・カストディとの境界を明瞭にできるが、適法性は名称ではなく実態で決まる。特にLND online key、一般routing、返金、第三者資金、円転媒介を追加すると法的分類が変わり得る。AML/CFT、制裁、不当勧誘対応は登録業者だけへ丸投げせず、NPO自身のガバナンスと技術状態へ組み込む。

## 一次資料

- [資金決済に関する法律（e-Gov法令検索）](https://laws.e-gov.go.jp/law/421AC0000000059)
- [電子決済手段・暗号資産サービス仲介業を行うみなさまへ（金融庁）](https://www.fsa.go.jp/common/shinsei/denanchuukai/index.html)
- [暗号資産交換業者関係の事務ガイドライン（金融庁）](https://www.fsa.go.jp/common/law/guide/kaisya/16.pdf)
- [金融機関におけるAML/CFT・拡散金融対策（金融庁）](https://www.fsa.go.jp/policy/amlcftcpt/index.html)
- [疑わしい取引の届出と届出先行政庁（警察庁JAFIC）](https://www.npa.go.jp/sosikihanzai/jafic/todoke/todotop.htm)
- [経済制裁措置及び許可手続きの概要（財務省）](https://www.mof.go.jp/policy/international_policy/gaitame_kawase/gaitame/economic_sanctions/gaiyou.html)
- [法人等による寄附の不当な勧誘の防止等に関する法律（消費者庁）](https://www.caa.go.jp/policies/policy/consumer_policy/donation_solicitation/)

## 関連ADR

- [ADR-0007](./0007-threat-model-and-human-error-controls.md): 攻撃・操作ミス対策
- [ADR-0008](./0008-certified-npo-joint-operation.md): 認定NPOを中心とする運営主体
- [ADR-0011](./0011-bitcoin-lightning-and-base-sbt.md): Bitcoin・Lightning受付とBase SBT
- [ADR-0012](./0012-lightning-inbound-liquidity-and-channel-capital.md): Lightning流動性と受付上限
- [ADR-0014](./0014-trisa-centered-vasp-travel-rule-network.md): 登録VASPを受領窓口とする段階的Travel Rule対応
