# ADR-0010: マルチチェーンデモのデプロイ、可観測性、縮退運転

- 状態: Accepted
- 日付: 2026-08-04

## 文脈

Ethereum SepoliaとBase Sepoliaへ同じデモを展開し、GitHub Pagesから支援イベントと玉垣SBTを読み取る過程で、コントラクトが正常でも利用者には失敗または0件に見える問題が発生した。本番候補はBase ETHとPolygon JPYCのマルチチェーン構成であるため、デモで判明した運用上の失敗を設計要件へ昇格させる。

## 発生した問題

| 分類 | 実際に観測した問題 | 影響 |
|---|---|---|
| Keystore入力 | RPC URLと秘密鍵の格納先を取り違え、URLをhex秘密鍵として解釈した | デプロイ開始前に`Invalid hex string`で停止 |
| RPCエンドポイント | 廃止・誤パスのEthereum Sepolia RPCがHTTP 404を返した | Ignitionがネットワークへ接続できない |
| RPC同期 | transaction送信後にnodeのnonceまたはmempool反映が遅れた | `HHE10412`でデプロイが中断 |
| Ignition状態 | 実行済みdeployment IDへconstructor引数を変更して再実行した | reconciliation failed。既存futureと新moduleが不一致 |
| 実行環境 | Hardhat / Ignition / Node.jsの組合せで例外整形時に`inspect is not a function`が発生した | 本来の原因より手前で診断表示が失敗 |
| テストETH | Faucetがwallet履歴、ログイン、rate limit、anti-Sybil条件で拒否した | 新規デプロイヤーがgasを取得できない |
| アドレス照合 | 同じdeployerとnonceにより別chainで同じcontract addressが生成され得ることを見落とした | chainを伴わないアドレス比較で誤配線と誤認した |
| Pages設定 | Actions Variablesの変更だけではpush条件のworkflowが自動実行されなかった | 正しい設定を保存しても公開bundleが古いまま残った |
| Actions表示 | workflow実行タイトルにcommit messageが表示された | workflow名とcommit名を混同した |
| 集計RPC | Base公開RPCが広い`eth_getLogs`範囲を`Invalid parameters`で拒否した | 4件の支援と4件のSBTが存在するのに画面は0件表示 |
| 集計UI | 小さいselectとchain切替方式が発見しにくかった | Base Sepoliaが利用可能でもEthereum Sepoliaだけに見えた |
| Faucet UI | オンチェーンの24時間cooldownを読まず、受取後もボタンが有効に見えた | 必ずrevertする操作を利用者へ提示した |
| SBTプレビュー | 本人の編集画面に周囲のサンプル玉垣も表示した | 1支援につき1 SBTという単位を誤解させた |

秘密鍵、API key、復元フレーズなどのsecret値は障害記録、ADR、issue、ログへ転記しない。

## 決定

### 1. デプロイ前検査

- Node.jsとnpmの対応versionを`package.json`とCIで固定し、compileと全contract testをデプロイ前に実行する。
- RPC secretはURLとしてparseできること、`eth_chainId`が対象chain IDと一致することを送信前に確認する。
- deployer secretは`0x`付き32-byte値であることだけを検査し、値そのものを表示しない。導出addressと対象chain上のgas残高だけを表示する。
- deployerはtestnet専用とし、実資産を保有するwalletの秘密鍵をHardhatへ登録しない。

### 2. Ignition再実行規則

- RPC timeout、nonce反映遅延、dropped transactionでは、moduleとparameterを変更せず同じdeployment IDを再実行する。
- constructor、module future、parameterの意味を変更した場合だけ、新しいversion付きdeployment IDを採番する。
- reconciliation failedを解消する目的で既存deployment記録を削除しない。旧deploymentを監査証跡として残す。
- deployerを変更する場合は、未完了transactionと各accountのnonceを確認してから別deploymentとして扱う。

### 3. デプロイmanifest

各chainについて次を機械可読manifestとして保存し、UI設定はmanifestから生成する方向へ移行する。

- network名とchain ID
- module versionとdeployment ID
- deployer address
- 各contractのchecksum address、creation transaction、creation block、runtime codehash
- Vaultが参照するSBT、asset mode、許可token
- 集計開始block

addressだけをchainから切り離して識別しない。contractは`chainId:address`、SBTはADR-0004の`chainId:sbtContract:tokenId`で識別する。

### 4. RPCの役割分離と縮退

- デプロイ用RPC、ブラウザ公開用RPC、本番Indexer用RPCを分離する。
- デプロイ用とIndexer用はSLA、rate limit、archive/log範囲を確認した専用providerを基本とする。
- 公開デモはRPC上限以下のblock rangeへ分割して`eth_getLogs`を取得し、一部chunkの失敗を0件として扱わずエラーと最終成功blockを表示する。
- 複数RPCを用意する場合も、異なるchainのRPCをfallbackに混ぜない。fallbackごとに`eth_chainId`を検証する。
- 本番ではブラウザ全履歴走査を採用せず、ADR-0006の再編成対応Indexer、検証可能DB、読み取り専用APIを使用する。

### 5. マルチチェーン集計UI

- 集計ページは独立したchainカードを並べず、Ethereum SepoliaとBase Sepoliaを単一表の2行として同時表示する。本番はBase ETH、Polygon JPYC、Bitcoin BTCを単一表の3行として表示する。Bitcoin行はNative Bitcoinと有効化済みLightningをBTC換算で統合し、経路別内訳を表示する。Bitcoin受入・Indexerが未設定または受付未開始の間は、推測値を表示せず状態を「受付開始前」とする。
- 玉垣SBTはchain別ギャラリーに分割せず、全chain共通の一つのギャラリーへ統合する。各項目にchain名とglobal IDを表示する。
- chain別の金額、件数、最終同期block、同期時刻、エラー、finalityを明示する。
- ETHとJPYCを根拠のない為替レートで単一金額へ合算しない。必要な場合は数量を別々に表示し、合計参加件数にはchain横断重複の定義を明記する。
- 送金フォームでは誤chain送信を防ぐため、対象chainを明示選択し、wallet署名前にchain名とchain IDを再表示する。
- 統合玉垣表示は「全体俯瞰 → 100本単位の区画 → 個別玉垣」の段階表示とする。遠景では最大600本の軽量マーカーへサンプリングして全体密度を示し、近景だけtoken URI画像を並べる。
- wallet接続は閲覧中のaddress取得だけに使用し署名を要求しない。全chainでowner addressが一致するSBTを抽出し、本人の玉垣を強調する。
- 表示名、token ID、owner address、chain名、global IDをクライアント検索対象とする。恒久リンクはglobal IDをfragmentに格納し、対象区画へ移動する。fragmentに個人情報を追加しない。
- トップページの本番玉垣ブロックは`BASE_MAINNET_TAMAGAKI_SBT_ADDRESS`と`POLYGON_MAINNET_TAMAGAKI_SBT_ADDRESS`をchain別に受け取り、支援eventのtoken IDと照合する。将来のBitcoin／Lightning由来SBTはADR-0011のRegistryとBase版SBT設定を追加して同じギャラリーへ統合する。いずれの値もGitHub Actions Variablesから公開bundleへ渡す読み取り専用の公開情報とする。

### 6. Faucetを必須経路にしない

- 外部Faucetは利用可能性を保証しない補助経路とする。
- Faucetが拒否した場合は、保有するEthereum Sepolia ETHのcanonical bridge、別のtestnet accountからの送金、運営用testnet funding accountを案内する。
- MockJPYC UIは`nextFaucetAt`をオンチェーンから読み、cooldown中の操作を無効化して次回時刻を表示する。
- Faucet失敗をコントラクト、wallet接続、支援受付の失敗と混同しない。

### 7. GitHub Pagesの設定反映

- repository variable名、必須性、chain、公開可否を文書とworkflowで一元管理する。
- Variables変更後は`workflow_dispatch`でPages buildを再実行し、実行したcommit SHAとbuild時刻を確認する。
- UIは設定済みcontractのcode有無、chain ID、VaultとSBTの参照関係を検査し、不整合時は集計を表示しない。
- 公開RPC URLはbrowserから見える値として扱い、秘密鍵や無制限の課金API keyをPagesへ渡さない。

### 8. UI状態をオンチェーン状態へ一致させる

- transaction送信、pending、receipt成功、集計反映を別状態として表示する。
- Faucet cooldown、token残高、SBT発行数を推測せずcontractから再読込する。
- 玉垣編集プレビューは1支援につき本人の1本だけを表示する。多数の玉垣による垣根は集計・ギャラリー側で表現する。

## 結果

デモは公開RPCだけでも動作確認できるが、Faucet、RPC、Pages cache、外部providerの可用性を保証しない。RPC分割取得と最大600本の遠景サンプリングはデモの縮退策であり、本番IndexerやCanvas/WebGL描画の代替ではない。単一表と統合ギャラリーで全体像は分かりやすくなる一方、データの出所が見えにくくなるため、各行・玉垣・履歴にchain名とglobal IDを残し、chain別の独立したエラー表示と最終同期点を提供する。

## 関連ADR

- [ADR-0002](./0002-demo-system-functional-spec.md): デモ機能とテスト資産
- [ADR-0004](./0004-chain-sbt-and-attestation.md): マルチチェーンとglobal ID
- [ADR-0006](./0006-security-boundaries-and-verifiable-batches.md): 本番Indexerと公開読み取り境界
- [ADR-0007](./0007-threat-model-and-human-error-controls.md): 操作ミスと独立照合
- [ADR-0009](./0009-l2-selection-and-escape-hatch.md): Base L2障害と回収
