# 8. ロードマップ

## Phase 0 — 構想とプロトタイプ

- VitePressホワイトペーパーとADR公開
- 関係者説明用Webデモ
- Hardhat 3コントラクト、テスト、Ignitionデプロイ
- 実資金を扱わないローカル検証

## Phase 1 — 関係者協議

- 熊本県との目的、受領先、報告項目の協議
- BaseでのETH受付と、Polygonでの公式JPYC受付・JPYC EX償還について事業者確認
- BaseのData Availability、forced transaction、canonical bridge、proof、upgrade権限と、Polygonのmilestone、checkpoint、PoS Bridgeを別々に評価
- 既存認定NPOの選定、理事会協議、会計、資金帰属、規約、個人情報管理の設計
- 登録金融・決済事業者と技術受託者の責任分界・契約設計
- 脅威モデリングと外部レビュー
- Bitcoin／Lightningに対応する登録事業者、Bitcoin multisig、Lightning node、BIP-322対応範囲、confirmation基準の協議

## Phase 2 — 公開テストネット

- 公式構成に近いマルチシグとロール分離
- インデクサー、公開API、ダッシュボードの接続
- 県受領・復興報告の模擬運用
- 障害、再編成、鍵紛失、緊急停止の訓練
- L1緊急マルチシグ、L2 Escape Controller、L1 Recovery Vaultの実装
- Base Sepolia等でforced transactionからcanonical withdrawal、L1受領、二重送金防止までの完全退出訓練
- Polygon testnetでJPYC相当token、Polygon版SBT、chain別global ID、停止・回収・統合集計を訓練
- Bitcoin SignetまたはtestnetとLightning test環境からBase Sepolia Registryへ閾値アテステーションし、一回限りのSBT Claimを訓練

## Phase 3 — 監査と限定運用

- スマートコントラクト第三者監査
- L2/L1エスケープハッチ、cross-domain認証、address aliasingの第三者監査
- 法務、会計、資金決済、AML等の確認
- NPOへのJPYC支援から円転、熊本県への円貨寄附までの少額端間試験
- Base ETHとPolygon JPYCを同一会計batchへ統合しないchain別照合試験
- Native BTC／LightningからNPO Bitcoin multisig、登録事業者の少額円転、Base SBT、県送金batchまでの端間照合試験
- 金額・期間を限定した運用と照合
- 支援者・熊本県・事業者からのフィードバック

## Phase 4 — 本番運用

- 正式な受付サイトとコントラクト公開
- 継続的な県受領確認・復興報告
- 財務・セキュリティ・透明性レポート
- 半期ごと、およびL2・bridgeのupgrade後のエスケープハッチ訓練
- 公開コミュニティによる改善提案
- Native Bitcoin／Lightning受付とBitcoin由来Base玉垣の継続運用

各フェーズの移行は日付ではなく、合意、監査、運用能力が満たされたかで判断します。
