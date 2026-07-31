# 熊本災害支援DAO — Kumamoto Relief DAO

世界からETH・JPYCによる復興支援を受け付け、熊本県指定先への送金とインフラ復旧報告を検証可能にするプロトタイプです。現在のWeb画面とコントラクトは説明・検証用であり、実資金を受け付けません。

## 構成

```text
app/                    関係者説明用Webデモ
contracts/              Solidityコントラクト
test/                   Hardhat 3 + Node Test Runner + Viemテスト
ignition/modules/       Hardhat Ignitionデプロイ定義
ignition/parameters/    デモ・本番パラメータ例
scripts/                補助デプロイスクリプト
docs/adr/               本番系・デモ系の機能仕様と意思決定記録
```

## コントラクト

- `RecoverySupportVault`: ETHと許可済みERC-20を受領し、熊本県指定先だけへ集約送金
- `TamagakiSBT`: ERC-721 + ERC-5192型の譲渡不能な玉垣
- `RecoveryAttestationRegistry`: 県受領確認と復興報告のハッシュを記録
- `RecoverySupportCouncil`: SBT保有者による非拘束の参考投票。資金移動権限なし
- `MockJPYC`: ローカルテスト専用

## 必要環境

- Node.js 22.13.0以上
- npm

## セットアップ

```bash
npm install
npm run contracts:compile
npm run test:contracts
npm run dev
```

すべての検証：

```bash
npm test
```

## ローカルデプロイ

```bash
npm run contracts:deploy:local
```

## テストネットデプロイ

1. `.env.example`を参考にHardhatのConfiguration Variablesを設定する。
2. `ignition/parameters/production.example.json`を`production.json`へコピーする。
3. マルチシグ、熊本県指定受領先、報告者、公式JPYCアドレスへ置換する。
4. 次のいずれかを実行する。

```bash
npm run contracts:deploy:sepolia
npm run contracts:deploy:base-sepolia
```

本番デプロイ前には外部監査、正式な受領合意、公式JPYCのチェーン・コントラクト確認、マルチシグとタイムロックの導入が必要です。

## 重要な境界

- 税額控除・寄附金控除を提供しない
- DAO参考投票は熊本県の予算執行を拘束しない
- 個人情報、氏名、住所、正確な位置情報をオンチェーンへ保存しない
- デモ系は実ウォレット、実JPYC、実受入口座へ接続しない

詳細は[ADR索引](docs/adr/README.md)を参照してください。

## ホワイトペーパー

VitePress版ホワイトペーパーは`docs/`にあります。

```bash
npm run docs:dev
npm run docs:build
```

GitHub Pages: https://shigeichiroyamasaki.github.io/yui-no-kaki-kumamoto/

### 図と数式

ホワイトペーパーでは、コードフェンスの言語を `mermaid` にすると図として描画されます。TeX数式はインラインの `$...$` と、別行立ての `$$...$$` を利用できます。
