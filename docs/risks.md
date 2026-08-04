# 9. セキュリティ評価・リスク・免責

## 評価の前提

この評価は2026年8月4日時点のプロトタイプコードと運用案を対象とします。外部監査、ペネトレーションテスト、熊本県・交換事業者との実運用試験に代わるものではありません。

重大度は次の基準です。

| 重大度 | 判断基準 |
|---|---|
| **Critical** | Vault資金の大規模・不可逆な損失、または熊本県災害支援口座以外への送金につながる |
| **High** | 虚偽の受領証跡、重要権限侵害、大規模な集計誤り、回復困難な個人情報公開につながる |
| **Medium** | 一時停止、限定的な誤表示、個別支援者への被害、運用遅延につながる |
| **Low** | 影響が限定され、容易に検知・回復できる |

## 結論

現行実装はSepoliaでの技術デモには使用できますが、実資金を受け付ける本番水準ではありません。特に次の項目を**本番開始阻止条件**とします。

1. 管理・財務EOAを組織マルチシグとタイムロックへ完全移管する。
2. 実装済みの受領先変更の提案・2日待機・実行に加え、独立承認と管理権限のtimelockを導入する。
3. 送金バッチのMerkle root、決済指図hash、上限、期限、包含済み`supportId`をコントラクトまたは検証可能な決済層で拘束する。
4. 実装済みのVault残高・batch・日次上限を有限値で設定し、最大滞留時間を監視する。
5. pauseとunpause、設定変更、送金、受領報告を別ロールへ分離する。
6. 許可ERC-20の実受領額を残高差分で計測し、token codehash・decimals・symbolを登録時に固定する。
7. 外部監査、フォークテスト、障害訓練、少額の端から端までの送金試験を完了する。
8. L1緊急マルチシグ、L2 Escape Controller、L1 Recovery Vaultを実装・監査し、forced transactionからcanonical withdrawal、L1受領、二重送金防止までの完全退出訓練を完了する。

## 攻撃者による主要シナリオ

| ID | 重大度 | 攻撃・故障 | 現在の防御 | 残余リスクと必須対策 |
|---|---|---|---|---|
| A-01 | **Critical** | admin鍵侵害により`beneficiary`を攻撃者へ変更 | `AccessControl`、変更event、提案後2日待機 | admin侵害だけで遅延後に変更できる。別管理マルチシグ、admin timelock、旧新アドレスの独立照合、変更時pauseが必要 |
| A-02 | **Critical** | treasurer鍵侵害または悪意ある署名者がVault残高を送金 | 固定`beneficiary`、`nonReentrant`、重複ID、日次・batch上限、manifest拘束 | 新しいrootとIDで同じ支援を再処理できる。独立署名、supportId包含DB、遅延実行、監視が必要 |
| A-03 | **Critical** | 事業者入金アドレスのすり替え、address poisoning、誤chain | 固定送付先という設計方針 | 登録時と実行時の二経路照合、code/address allowlist、決済指図hash、少額疎通、表示名でなくアドレス全文の確認が必要 |
| A-04 | **High** | 悪意ある・侵害されたERC-20がrevert、再入、偽metadata、手数料差引を行う | allowlist、`SafeERC20`、`nonReentrant`、残高差分、metadata/codehash固定 | 公式資産限定、コード更新時の再審査、再入・fee-on-transfer試験が必要 |
| A-05 | **High** | reporter鍵侵害により虚偽の県受領・復興報告を登録 | role制限、同一IDの上書き禁止、後継参照 | 虚偽の後継も登録できる。報告マルチシグ、証憑hash照合、銀行入金との二人照合が必要 |
| A-06 | **High** | DNS、GitHub Pages、依存パッケージ、RPCの侵害で偽Vaultへ誘導 | ウォレット確認、公開アドレス | CSP、依存固定とSBOM、署名付きrelease、複数公式経路、RPC応答の相互照合、変更監視が必要 |
| A-07 | **High** | indexer再編成処理不備や意図的イベント注入で集計・バッチを二重計上 | eventとbatch ID | confirmation/finality、再編成rollback、assetとVaultの厳格filter、再生可能処理、会計不変条件が必要 |
| A-08 | **High** | SBTへ第三者氏名・中傷・個人情報を永久記録 | 文字数、制御文字、escape、UI同意 | 直接呼出しはUIを回避できる。recipient署名、禁止文字だけでなく運用通報、実名を要求しない方針、本番では撤回可能off-chain方式の優先が必要 |
| A-09 | **Medium** | 第三者へ無断でSBTを発行し、ウォレットをspamまたは投票資格操作 | SBTは譲渡不能かつ`recipient == msg.sender` | 代理受領を将来追加する場合はEIP-712受領同意が必要 |
| A-10 | **Medium** | 多数ウォレット・少額支援による参考投票Sybil攻撃 | 1 wallet 1 vote、資金移動権限なし、提案時cutoff、有効status検査 | cutoff後の追加発行は排除するが、複数walletによる事前取得は残る |
| A-11 | **Medium** | 大量支援、巨大ログ、RPC rate limitで公開画面を停止 | 入力長制限 | rate limit、キャッシュ、ページング、複数RPC、バックフィルキュー、read-only degraded modeが必要 |
| A-12 | **High** | Base sequencer停止・検閲、Data Availability・proof・canonical bridge障害、悪意あるupgrade | pause、処理中表示、複数RPC | 代替RPCだけではETHを退出できない。L1 forced transaction、canonical withdrawal、固定Recovery Vault、L1 gas reserve、停止基準、challenge期間中の公開状態が必要 |
| A-13 | **High** | Polygon validator/milestone/checkpoint/PoS Bridge障害、偽JPYC、JPYC EX償還停止 | 公式asset allowlist、pause、chain別集計 | Baseのescape hatchは利用できない。公式JPYCのchain ID・codehash固定、複数RPC、finalized block使用、JPYC EX直接償還とPoS Bridgeの優先順位、最大滞留額・停止基準が必要 |

## 当事者の操作ミス・内部不正

攻撃者がいなくても、次の誤操作で同程度の被害が起こり得ます。

| ID | 重大度 | 操作ミス・内部不正 | 防止・検知・回復 |
|---|---|---|---|
| H-01 | **Critical** | seedをクラウド、写真、チャットへ保存する | ハードウェア生成、物理二拠点保管、秘密情報を入力させない訓練、定期棚卸し |
| H-02 | **Critical** | Safe owner、threshold、networkを誤って設定する | 作成者と検証者を分離し、オンチェーンowner一覧と閾値を二人が独立確認。テストネットで同一手順を反復 |
| H-03 | **Critical** | 桁・decimals・asset・chainを取り違えて送金する | 人間向け値とraw値を併記、上限、simulation、hardware walletでdecode、少額先行、四眼承認 |
| H-04 | **Critical** | 古い・偽の事業者入金先へ送る、memo/tagを忘れる | 有効期限付き承認台帳、二経路照合、アドレス帳、変更後少額試験、事業者受付確認 |
| H-05 | **High** | 同じ支援を別batch IDで再度送金する | `supportId`包含DB、Merkle root、前batch hash、送金前後の会計不変条件、独立照合 |
| H-06 | **High** | 見積期限後に実行し、円転額や手数料が想定から乖離する | quote expiryを決済指図へ含め、期限切れtransactionを実行不能にする。許容slippageと中止条件を定義 |
| H-07 | **High** | 銀行口座、口座名義、振込目的を誤登録する | 県の口座指定書、電話等の別経路確認、非公開台帳の二人承認、銀行少額入金試験 |
| H-08 | **High** | 誤った円金額・証憑hashをRegistryへ永久登録する | 登録前preview、二人承認、原本hash再計算、取消・後継attestation仕様 |
| H-09 | **Medium** | 誤ってpauseし受付を停止、または侵害後に早すぎるunpauseをする | pauseとunpauseのロール分離、unpause timelock、原因・影響・再発防止の完了承認 |
| H-10 | **Medium** | 人事異動後も旧職員のowner・roleが残る | 退職・異動チェックリスト、四半期access review、後任追加後の旧鍵削除、HR連携 |
| H-11 | **Medium** | テストネットと本番、MockJPYCと公式JPYCを混同する | 端末・アカウント・UI色・ドメイン分離、chain IDとcontract addressの強制表示、本番にMockをデプロイしない |
| H-12 | **Medium** | ニックネーム入力欄へ本名・第三者情報を誤公開する | 空欄から本人が名称を決め、不可逆性を直前表示。プレビュー、再確認、off-chain方式の選択肢を用意 |

## 現行コントラクトと本番要求の差

| 項目 | 現行プロトタイプ | 本番要求 |
|---|---|---|
| 管理・財務 | 初期値は同一EOAに設定可能 | 別マルチシグ、timelock、個人EOAのrole削除 |
| 受領先変更 | 提案、2日待機、実行を実装 | 設定マルチシグ、独立照合、少額試験、admin timelock |
| pause / unpause | `PAUSER_ROLE`と`UNPAUSER_ROLE`を分離 | 別主体へ付与し、解除手順と遅延を運用で拘束 |
| バッチ | ID重複、Merkle root、指図hash、期限、上限を拘束 | supportIdの重複なき包含を生成・監視基盤で検証 |
| ERC-20受領額 | balance差分を記録しcodehash・symbol・decimalsを固定 | 公式資産の審査と異常token監視 |
| Vault滞留 | asset別残高・batch・日次上限を実装 | 有限値設定、最大滞留時間、警報 |
| 報告訂正 | 後継attestationを参照可能 | 報告マルチシグ、UIで旧記録を明示 |
| SBT受領 | 支援者本人宛てだけを許可 | 代理受領が必要ならEIP-712同意を追加 |
| 投票資格 | 提案作成時token ID cutoffと有効statusを検証 | block snapshot方式との比較、Sybil耐性の継続評価 |
| オンチェーン表示名 | UI同意は回避可能 | 本番採否を再判断し、採用時は受領署名と明確な警告 |
| L2エスケープ | 未実装。Base Sepolia対応は接続・デモ設定のみ | L1緊急マルチシグ、Escape Controller、固定L1 Recovery Vault、cross-domain認証、完全退出訓練 |
| Polygon JPYC / SBT | `ERC20Only`・chain ID `137`・公式JPYC固定module、global ID helperを実装。本番未デプロイ | milestone finality、停止・回収runbook、複数RPC本番Indexer、Polygon testnet端間試験、外部監査 |

## 運用上の安全原則

- **四眼原則**: 提案者、照合者、署名者、実行者を可能な限り分離する。
- **停止優先**: 不明点がある場合は送金せず、正当性が証明されるまでpauseを維持する。
- **最小額・最小権限**: Vault残高、1batch額、1日額、鍵権限を必要最小限にする。
- **全経路照合**: chain event、事業者約定、銀行入金、Registryをbatch IDで突合する。
- **訂正を履歴化**: 上書きや削除ではなく、取消と後継記録で誤りを訂正する。
- **秘密情報を公開証跡へ含めない**: seed、秘密鍵、銀行口座番号、個人情報をhash前の公開文書にも含めない。

具体的な操作は[認定NPO・熊本県向け運用ビュー](./prefecture-operations)を参照してください。設計判断は[ADR-0006](./adr/0006-security-boundaries-and-verifiable-batches)、[ADR-0007](./adr/0007-threat-model-and-human-error-controls)、[ADR-0008](./adr/0008-certified-npo-joint-operation)、[ADR-0009](./adr/0009-l2-selection-and-escape-hatch)に記録しています。

## 法務・行政・プライバシー

初期本番候補は認定NPOへの支援と、そのNPOから熊本県への別個の円貨寄附です。認定NPOであることだけで資金決済法上の登録が不要になるわけではありません。支援金の帰属、電子決済手段の管理・媒介、AML/CFT、制裁、会計・税務、表示、個人情報を整理し、専門家、当局、登録事業者、県の確認を受けます。本構想は現時点で特定NPOまたは熊本県の承認・提携を示しません。

ウォレット履歴から行動が推測されます。画像付きデモで同意して記録した表示名とメッセージは撤回できません。実名を要求せず本人が決めたニックネームを利用でき、第三者情報を入力しないよう警告します。本番では撤回可能なオフチェーン方式を優先候補とします。

## 免責

本ホワイトペーパーは構想・技術検証に関する説明資料であり、法務、税務、会計、投資またはセキュリティ保証ではありません。玉垣SBTは投資商品ではなく、利益や価値上昇を約束しません。税制優遇、返礼品、寄附金控除は提供しません。

仕様、対応チェーン、関係主体、運用方法は協議、監査、検証により変更されます。実際の支援受付は、上記の本番開始阻止条件、必要な合意、規約、監査、訓練がすべて完了した後に別途告知します。
