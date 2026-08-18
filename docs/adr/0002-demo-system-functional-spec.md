# ADR-0002: デモ系の機能仕様

- 状態: Accepted
- 日付: 2026-07-31
- 更新日: 2026-08-12

## 文脈

熊本県、JPYC、登録金融・決済事業者、法的運営主体候補の認定NPOとの調整前に、提案全体を安全に説明できる動作デモが必要である。

## 決定

デモ系は本番と同じ概念モデルを用いるが、実資産・実行政システムから完全に分離する。目的に応じて「UI説明デモ」「Ethereum Sepolia / Base Sepolia統合デモ」「ローカルBitcoin／LND開発デモ」を区別する。

### D-01 UI説明デモ

- JPYCまたはETH、金額、国、表示名、メッセージを入力できる。
- 実ウォレット接続、署名、送金を行わない。
- 実行時にサンプル玉垣、統計、最新活動を即時更新する。
- 常時「INTERACTIVE PROTOTYPE」を表示する。

### D-02 Ethereum Sepolia / Base Sepolia統合デモ

- Ethereum SepoliaまたはBase Sepolia上で利用者のウォレットへ接続し、テスト用ETHまたは`MockJPYC`のトランザクションへ署名できる。
- `RecoverySupportVault`への送金、`SupportReceived`イベント、譲渡不能な玉垣SBTの発行を実際のテストネット取引として確認できる。
- 送金前に、玉垣へ表示する任意の表示名、奉納メッセージ、金額の表示・非表示を編集し、実際に発行される形式の画像をプレビューできる。表示名の初期値は空欄とし、支援者が実名または自分で決めたニックネームを入力する。
- 画像メタデータ対応の送金関数は、Vaultが実際に受領した資産名・金額をSBTへ渡す。利用者が金額そのものを書き換えることはできない。
- 表示名とメッセージをオンチェーンSVGへ永続記録する前に、撤回・訂正できないことへの明示的同意を求める。住所、連絡先、第三者の個人情報を入力しないよう警告する。
- `MockJPYC`にはデモ用faucetを設け、実JPYC、法定通貨、換金可能な価値を持たないことを常時明示する。
- コントラクトアドレス、チェーンID、トランザクションをブロックエクスプローラーで検証できるようにする。
- 国は本人による任意申告または非公開とし、ウォレットやIPアドレスから推定しない。
- 本番の募集開始、熊本県による承認、税制優遇を示す表現を使用しない。

### D-03 ダッシュボード

- UI説明デモでは、累計支援額、支援ウォレット、支援件数、国・地域数、国別分布、ランキング、14日間推移をサンプルデータで表示する。
- 統合デモでは、Ethereum SepoliaとBase Sepoliaの支援額・件数を単一集計表のchain別2行として表示する。chainごとの独立カードや集計画面の切替を採用しない。
- Base Sepolia Bitcoin Registryが設定済みの場合は、Native Bitcoin／Lightningデモを同じ集計表へ追加する。有効な`SupportAttested`だけを金額・件数の正本とし、`SupportInvalidated`を除外する。`BitcoinTamagakiIssued`とSBT mintはtoken対応にだけ使用し、支援額へ再加算しない。
- 両chainの玉垣SBTを一つのギャラリーへ時系列統合し、各SBTへchain名とglobal IDを表示する。支援履歴も一つの表へ統合する。
- Bitcoin／Lightning由来のBase Sepolia SBTも同じギャラリーと履歴へ統合し、routeと専用SBT contractを表示する。
- 統合ギャラリーには、全玉垣数、100本単位の区画選択、個別画像の近景を設ける。wallet接続による保有SBT抽出と、表示名・番号・address・global ID検索を提供する。
- デモ集計ページでは、熊本城を模したCSS俯瞰画像を使用しない。100本単位の区画、検索、個別玉垣によって支援規模と本人の玉垣を確認できるようにする。
- 個別玉垣は`#tamagaki=<global ID>`の共有リンクで直接開き、対象区画へ移動して強調表示する。共有リンクは閲覧だけでwallet署名を要求しない。
- 送金フォームだけは誤chain送信を防ぐため対象chainを明示選択する。
- 公開RPCの`eth_getLogs`範囲上限に合わせて分割取得し、取得失敗を0件と表示しない。詳細は[ADR-0010](./0010-multichain-demo-deployment-and-observability.md)に従う。
- テストネット集計は実際の募金額と合算せず、テストデータであることを明示する。
- 円換算値を表示する場合は説明用参考値であり、受領額ではないことを明示する。

### D-04 資金フロー

- 集約、円転、熊本県受領をボタン操作で段階的に再現する。
- デモ受領番号とデモ証憑ハッシュを表示する。
- 実銀行口座・実交換所・実JPYCへ接続しない。

### D-05 復興報告

- 県担当者デモ画面から事業と進捗率、報告文を変更できる。
- 変更はブラウザ内状態だけに反映し、永続保存しない。
- 熊本県による承認済みと誤認させる表現を避ける。

### D-06 コントラクトデモ

- HardhatローカルネットワークとEthereum Sepolia統合デモでは`MockJPYC`を使用できる。
- 本番モジュールとデモモジュールを分離する。
- 既存デプロイとのABI不一致による誤送信を防ぐため、画像メタデータ対応デプロイには新しいdeployment IDを使用し、フロントエンドはメタデータ版が明示された場合だけ新関数を有効にする。
- デモ用鍵、アドレス、取引を本番へ流用しない。
- Ethereum Sepoliaの管理者、受領先、報告者が同一EOAでもよいが、これはデモ限定とし、本番構成の安全性を表さない。

### D-07 ローカルBitcoin／LND開発デモ

- Bitcoin Core `regtest`、miner wallet、Alice／BobのLND nodeを隔離されたローカル環境で使用し、block生成、node同期、peer接続、channel開設、BOLT 11 invoice、`SETTLED`までを無価値の試験BTCで再現する。
- Base側の`BitcoinSupportRegistry`はHardhatまたはBase Sepoliaで、署名済みIntent、閾値署名、outpoint／Lightning commitmentの一意性、SBT発行、無効化を検証する。
- Bitcoin Core、Alice／Bob LND、永続volume、loopback限定host port、内部networkを定義したローカルregtest専用Docker Composeをリポジトリへ同梱する。LND settlement購読、検証者service、Registry送信、統合Indexer、公開UIを一つに結ぶ端間自動化は未実装であり、手動開発環境を公開デモまたは本番実装済みと表現しない。
- `regtest`のseed、macaroon、address、channel、BTCをpublic testnetまたは本番へ転用しない。Signet／testnetとBase Sepoliaの統合試験は次段階とする。
- ローカル集計でも、invoice `SETTLED`、Registry `SupportAttested`、SBT mintを同じ支援額として複数回加算しない。

## 受入条件

- 支援疑似実行後に玉垣と累計値が更新される。
- 複数chainに同一walletのSBTがある場合、「自分の玉垣」はchainをまたいですべて表示される。検索結果0件とRPC取得失敗を別の状態として表示する。
- Ethereum SepoliaでテストETHまたはMockJPYCを送信し、取引と発行されたSBTを検証できる。
- 送信前に玉垣画像を編集・確認でき、送信後は`tokenURI`から同じ表示名、実受領額、メッセージを含むSVG画像を取得できる。
- 円転と県受領の状態遷移を再現できる。
- 復興報告更新後に事業カードが更新される。
- 各画面とREADMEで、UI上の疑似値または価値を持たないテストネット資産だけを扱う旨が確認できる。
- Hardhatテストが全件成功する。

## 結果

関係者は、画面上の全体フローとテストネット上の署名・送金・SBT発行を段階的に体験できる。テストネット取引はオンチェーンで検証可能だが、デモの結果は実資金の寄付、法的合意、金融取引、熊本県の受領を証明しない。
