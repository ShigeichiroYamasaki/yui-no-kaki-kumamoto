# ADR-0004: マルチチェーン受付、玉垣SBT、アテステーション

- 状態: Proposed
- 日付: 2026-07-31
- 更新日: 2026-08-05

## 決定

- 本番候補ではETHをBase Mainnet、資金移動業型JPYCをPolygon PoS（chain ID `137`）で受け付け、チェーン別にVaultをデプロイする。
- Polygon VaultはJPYC株式会社が公表する公式JPYCコントラクトだけをallowlistへ登録する。非公式ブリッジ、wrapped JPYC、同名tokenを許可しない。
- 玉垣はERC-721とERC-5192を採用する。
- 玉垣SBTは支援を受けたチェーンのVaultが同一transaction内で発行する。ETH支援はBase版SBT、JPYC支援はPolygon版SBTとし、単一chainへのcross-chain mintを行わない。
- 前項の原子的発行はEVM支援に適用する。Native Bitcoin／LightningはADR-0011に基づく明示的例外とし、Bitcoin側の確認と独立検証者の閾値アテステーション後にBase版SBTを発行する。
- チェーン間集計はインデクサーで統合し、支援IDにチェーンIDと受付コントラクトを含める。
- 公開画面はchainを切り替えて一方だけを見せず、単一集計表へchain別の行を並べる。玉垣SBTは全chain共通の一つのギャラリーへ統合する。address単体ではなく`chainId:address`でcontractを識別し、別chainに同一addressが存在しても混同しない。
- SBTのglobal IDは`chainId:sbtContract:tokenId`とし、同じtoken IDが複数chainに存在しても衝突させない。
- 受領確認・復興報告は文書本体ではなくハッシュを`RecoveryAttestationRegistry`へ記録する。
- Ethereum Sepoliaを標準統合デモネットワーク、Base SepoliaをL2代替統合デモネットワークとする。両testnetの`MockJPYC`と玉垣SBTを本番資産・本番証明として扱わない。
- Base上のETHに関するfinality、Data Availability、forced transaction、canonical bridge、proof、upgrade権限とL1エスケープハッチは[ADR-0009](./0009-l2-selection-and-escape-hatch.md)に従う。Polygon JPYCはmilestone finality、checkpoint、PoS BridgeまたはJPYC EX直接償還に基づく別runbookを用意する。
- 画像対応デモの玉垣SBTは、ERC-721 `tokenURI`からオンチェーンSVGを返す。氏名・メッセージは送金前に編集・プレビューし、明示的な公開同意を必須とする。
- 玉垣は支援額による大小を設けず、すべて同一寸法とする。多数の玉垣を横方向へ連続させ、熊本城を取り囲む一つの垣根として可視化する。下部には家紋と区別できるデジタル証明印と`TAMAGAKI SBT`を表示する。
- 俯瞰表示から個別SBTへ移動するときもchain境界でギャラリーを分断しない。個別位置、検索、共有URLはglobal IDを主キーとし、wallet addressだけを公開上の人物識別子として扱わない。
- 配置は支援年月の区画と区画内の発行順を原則とする。金額、国籍、知名度による前列・大型化は行わず、本人の玉垣は閲覧時だけ金色の輪郭等で一時的に強調する。
- 画像の資産と金額は`SupportReceived`と同じ実際の送金値から生成し、利用者が金額表示を偽装できないようにする。
- 表示名の初期値は空欄とし、支援者が実名または自分で決めたニックネームを入力する。本番系で氏名等を扱う場合は、オンチェーン記録の不可逆性を再評価し、撤回可能なオフチェーン方式も選択できるようにする。

## 理由

資産の公式性、低コスト、SBTの固有性、公開検証と行政文書の機密性を両立するため。

## 実装状況

`RecoverySupportVault`は期待chain IDと`AssetMode`をconstructorで固定する。`BaseEthRecoverySupportModule`は`8453 / NativeOnly`、`PolygonJpycRecoverySupportModule`は`137 / ERC20Only`と公式JPYCアドレスをコードで固定した。各Vaultは同じchainの`TamagakiSBT`だけへmintし、フロントエンドhelperは`chainId:sbtContract:tokenId`をglobal IDとして生成する。画像付きmintでは表示名を必須、奉納メッセージを任意とし、`showAmount=false`ではSVGだけでなくtoken metadataのAmount属性も省略する。ただし`SupportReceived`の実受領額は公開される。デモ集計は両Sepoliaを一つの表と、俯瞰・区画・個別表示を持つ一つのSBTギャラリーへ統合する。本番デプロイ、統合Indexer、chain別finality運用は未完了である。デプロイmanifestとRPC縮退は[ADR-0010](./0010-multichain-demo-deployment-and-observability.md)に従う。

## トレードオフ

マルチチェーンはインデクサー、鍵、RPC、finality、障害回復、コントラクトアドレス確認を複雑化する。EVM支援は支援とSBTを同一chainの同一transactionへ置いてcross-chain oracle、発行遅延、二重mintを避ける。Bitcoin／Lightningは国際的な支援入口を広げる代わりに閾値アテステーションと非原子的発行を受け入れる。オンチェーンSVGは外部ストレージに依存しない一方、発行ガスを増加させ、公開した氏名・メッセージを完全には削除できない。
