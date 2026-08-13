# 5. 透明性とデータ

## リアルタイム可視化

ダッシュボードはBase ETH、Polygon JPYC、Bitcoin BTCの3資産行を常時表示します。Bitcoin行はNative Bitcoinと、有効化済みの場合のLightningをBTC単位で統合し、経路別内訳も表示します。累計支援件数、参考値としてのEVMウォレット数、資産別数量、参考評価額、円転確定額、国・地域別分布、時間的推移、集約バッチ、県送金済み額、残高、復興事業の進捗を各networkの確定状況に応じて更新します。chainをまたぐ同一人物は判定できないため、ウォレット数やIntent数を「ユニーク支援者数」とは表示しません。無効な経路は0件ではなく「受付未開始」と表示します。

ブロック確定前の支援は「確認中」とし、確定集計から分離します。インデクサー障害時には最終同期時刻を表示します。

Bitcoinでは最後に合意したblock height、confirmation数、閾値アテステーション状態を表示します。Lightningを有効化した場合はinvoiceのsettled状態とdomain-separated payment commitmentを表示しますが、payment hash、preimage、node credential、支援者の非公開情報は公開しません。

## 集計の正本と単位

- Base／Polygonの確定額は、公式Vault address、chain ID、asset、開始blockを固定して取得した`SupportReceived`イベントだけから算出します。
- Native Bitcoin／Lightningの確定額は、Base `BitcoinSupportRegistry`の有効な`SupportAttested`だけから算出します。初期Bitcoinの検証者はbeneficiary VASPの認証済み入金明細とpublic chainを照合し、送金後Attestationへ`txid:vout`と実受領額を拘束します。元取引、SBT mint等は再加算しません。
- `SupportInvalidated`が登録された支援は確定額・確定件数から除外し、取消履歴と理由を残します。確認中のBitcoin取引と未決済invoiceは確定値へ含めません。
- 一意キーはEVMで`chainId:vault:supportId`、Native Bitcoinで`bitcoin:network:txid:vout`、Lightningで`lightning:network:domain-separated-payment-commitment`とします。支援件数は有効な一意キー数です。
- RegistryのNative Bitcoin `amount`はsatoshi、Lightning `amount`はmillisatoshiです。`Native BTC = Σsatoshi / 10^8`、`Lightning BTC = Σmillisatoshi / 10^11`、`Bitcoin BTC = Native BTC + Lightning BTC`とし、丸め前の整数値もAPIで公開します。
- 時系列はRegistryに記録された`observedAt`を支援発生時刻、Base event block timeを確定登録時刻として両方保持します。IndexerはNative Bitcoinのblock情報または限定領域のLightning settlement記録と照合し、不一致時は確定反映を停止します。Registry contract自体がBitcoin confirmationやLightning settlementを直接検証するわけではなく、閾値署名を検証します。

資産照合と円転・県送金照合は分離します。資産ごとに`確定受領量 = 未集約残高 + 事業者へ移転済み量 + 資産建て明示手数料 + 訂正差額`を検証し、円転batchごとに`円転総額 = 県送金済み円額 + 円貨処理中額 + 円建て明示手数料`を検証します。ETH、JPYC、BTC、円を一つの数量へ直接足しません。参考評価額には価格源と取得時刻を表示し、会計上の確定額と区別します。

## プライバシー

本番系では、氏名、住所、メール、IPアドレス、正確な位置情報、本人確認情報をオンチェーンへ保存しません。ウォレットと本人情報を安易に結び付けず、国・表示名・メッセージは撤回可能な任意公開情報とします。

画像付きSBTのSepoliaデモでは、支援者が明示的に同意した任意表示名とメッセージだけをオンチェーンSVGへ記録できます。これらとオンチェーンイベントは削除・訂正できません。一方、本番系のオフチェーン公開プロフィールは撤回可能です。この違いを支援前に明示します。

## 熊本県からのフィードバック

復興報告には事業ID、分野、地域、進捗率、支援金充当額、更新日、報告書ハッシュを含めます。修正は上書きせず、新しい報告として履歴を残します。

支援全体と復興事業全体の関係を示し、個々の支援が特定の工事を直接購入したかのような一対一表現は避けます。

## 検証可能性

第三者が独自に集計できるよう、コントラクトアドレス、ABI、イベント仕様、チェーンID、集計ルールを公開します。
