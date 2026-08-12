# メインネット支援状況

::: danger まだ募金を受け付けていません
熊本災害支援DAOの本番コントラクトはメインネットへデプロイされておらず、熊本県その他の関係者との運用合意も完了していません。このページに送金先アドレスが掲載されるまでは、実資産を送金しないでください。
:::

<div class="network-status-card network-status-card--inactive">
  <span>PRODUCTION / MAINNET</span>
  <strong>受付開始前</strong>
  <dl>
    <div><dt>支援総額</dt><dd>表示対象なし</dd></div>
    <div><dt>本番候補</dt><dd>ETH: Base / JPYC: Polygon / BTC: Bitcoin（未稼働）</dd></div>
    <div><dt>公式Vault</dt><dd>未デプロイ</dd></div>
    <div><dt>公式JPYC</dt><dd>未接続</dd></div>
  </dl>
</div>

## チェーン別の本番集計

本番開始後は切替操作を必要とせず、BaseのETH、PolygonのJPYC、BitcoinのBTCを一つの表の3行として常時表示します。Bitcoin行はNative Bitcoinと、有効化済みの場合のLightningをBTC単位で統合し、経路別内訳を表示します。異なる資産を恣意的な換算レートで合算しません。Bitcoin受入・Indexerが未設定または受付が無効な間は、0 BTCではなく「受付開始前」と表示します。

<MainnetSupportTrend locale="ja" />

## テストネットとは分離して表示します

Sepolia上のETH、MockJPYC、玉垣SBTは技術検証専用であり、この本番支援総額には含めません。テスト取引は[Ethereum / Base Sepoliaデモ集計](./demo-status.md)で確認できます。

本番受付を開始する際は、ネットワーク、公式Vault、利用可能資産、受領主体、開始ブロックを複数の公式経路で公表し、このページだけを本番集計の基準画面とします。
