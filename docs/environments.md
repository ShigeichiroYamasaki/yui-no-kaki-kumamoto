# 7. 本番系とデモ系

## 分離の原則

関係者協議前でも提案を体験できるよう、デモ系は本番と同じ概念モデルを使います。ただし、実資産、本番用ウォレット・アカウント、実行政システムから完全に分離します。UI説明デモはウォレットを使わず、統合デモはテスト専用ウォレットでテストネットへ署名します。

| 項目 | デモ系 | 本番系 |
|---|---|---|
| 資産 | 画面内の疑似値・MockJPYC・Bitcoin／Lightning test資産 | 許可済みETH・公式JPYC・Native BTC。Lightning BTCは例外承認後に追加 |
| ウォレット | UI説明デモは接続なし。統合デモはテスト専用walletで署名 | 本番専用の対応walletと署名 |
| ネットワーク | Hardhatローカル、Sepolia、Base Sepolia、Bitcoin Signet/testnet、Lightning test環境 | ETHはBase、JPYCはPolygon、初期BTCはNative Bitcoin、Bitcoin由来SBTはBase、Base ETHにはEthereum L1回収経路。Lightningは後日有効化 |
| 県受領 | デモ番号・疑似状態 | 正式受領先と証憑ハッシュ |
| 復興報告 | ブラウザ内で疑似更新 | 権限付き報告者が追記 |
| 表示 | 常時プロトタイプ表記 | 認定NPO、登録事業者、規約、資金帰属、状態を表示 |

## デモの受入条件

- 疑似支援後に玉垣と統計が更新される
- 集約、円転、県受領の状態遷移を再現できる
- 復興報告の更新を画面で確認できる
- 実資金を扱わないことが常時明示される
- Hardhatのコントラクトテストがすべて成功する
- Bitcoin outpointまたはLightningのdomain-separated payment commitmentからBase Sepolia SBTを一度だけ発行し、限定監査領域のpayment hashとの対応、再編成、重複、期限切れを再現できる

## 本番移行ゲート

次が揃うまで本番受付を開始しません。

1. 熊本県との正式協議と受領方法の合意
2. 具体的な認定NPOの理事会承認、会計処理、資金帰属、規約、プライバシー方針の確定
3. Polygon（chain ID `137`）上の資金移動業型JPYC公式コントラクトとJPYC EX償還経路の確認
4. 対象業務・チェーン・公式JPYCに対応する登録金融・決済事業者との契約
5. マルチシグ、タイムロック、鍵管理の確立
6. 第三者セキュリティ監査と運用訓練
7. ADR-0008に基づくNPO・事業者・技術受託者・県の責任分界と少額端間試験
8. ADR-0009に基づくL1エスケープハッチの実装、外部監査、完全退出訓練
9. Base・Polygon両Vault/SBT、global ID、chain別finality、統合集計、Polygon停止・回収手順の端間試験
10. ADR-0011に基づくBitcoin multisig、独立nodeの閾値アテステーション、署名済みIntent、Base SBT Claim、少額円転の端間試験
11. Lightningを有効化する場合に限り、remote signerまたは外部事業者、限定macaroon、hot balance上限、復旧訓練、payment commitmentを含む独立した追加承認
