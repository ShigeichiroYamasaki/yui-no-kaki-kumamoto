# スマートコントラクト

熊本災害支援DAOのスマートコントラクトは、ホワイトペーパーと同じGitHubリポジトリで公開・管理しています。現在の実装は関係者協議前のプロトタイプであり、実資金を受け付ける本番環境へはデプロイしていません。

[GitHubでソースコード全体を見る](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/tree/main/contracts)

## コントラクト構成

| コントラクト | 役割 | ソースコード |
|---|---|---|
| RecoverySupportVault | ETHと許可されたERC-20による支援を受け付け、登録済み交換・決済事業者入金先への資金移転を記録します。 | [RecoverySupportVault.sol](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/blob/main/contracts/RecoverySupportVault.sol) |
| TamagakiSBT | 支援参加の証しとなる、ERC-721およびERC-5192型の譲渡不能な玉垣SBTを発行します。 | [TamagakiSBT.sol](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/blob/main/contracts/TamagakiSBT.sol) |
| RecoveryAttestationRegistry | 熊本県側の受領確認や復興事業報告について、文書ハッシュと参照情報を記録します。 | [RecoveryAttestationRegistry.sol](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/blob/main/contracts/RecoveryAttestationRegistry.sol) |
| RecoverySupportCouncil | SBT保有者による非拘束のクアドラティック参考投票を提供します。資金移動権限は持ちません。 | [RecoverySupportCouncil.sol](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/blob/main/contracts/RecoverySupportCouncil.sol) |
| MockJPYC | ローカル環境でJPYC相当のERC-20支援フローを確認するためのテスト専用トークンです。 | [MockJPYC.sol](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/blob/main/contracts/mocks/MockJPYC.sol) |

## テストとデプロイ

- [Hardhat 3設定](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/blob/main/hardhat.config.ts)
- [コントラクトのテスト一式](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/tree/main/test)
- [Hardhat Ignitionデプロイ定義](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/tree/main/ignition/modules)
- [デプロイ用パラメータ例](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/tree/main/ignition/parameters)
- [補助デプロイスクリプト](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/blob/main/scripts/deploy.ts)

### Base Sepoliaデモを追加する

Sepolia版を残したまま、別のIgnition deployment IDでセキュリティ強化版をデプロイします。

```bash
npx hardhat keystore set BASE_SEPOLIA_RPC_URL
npx hardhat keystore set DEPLOYER_PRIVATE_KEY
npm run contracts:deploy:demo:base-sepolia:security-v3
```

最初の値にはBase Sepolia対応RPCのHTTPS URL、二つ目にはテストネット専用デプロイヤーの`0x`付き秘密鍵を保存します。GitHub Pagesには秘密鍵を設定しません。デプロイ結果の5アドレスと最初のblockを、GitHubリポジトリの`Settings → Secrets and variables → Actions → Variables`へ次のように対応付けます。

| Ignitionの出力 | GitHub Actions Variable |
|---|---|
| `RecoverySupportVault` | `BASE_SEPOLIA_VAULT_ADDRESS` |
| `MockJPYC` | `BASE_SEPOLIA_JPYC_ADDRESS` |
| `TamagakiSBT` | `BASE_SEPOLIA_TAMAGAKI_SBT_ADDRESS` |
| `RecoveryAttestationRegistry` | `BASE_SEPOLIA_REGISTRY_ADDRESS` |
| `RecoverySupportCouncil` | `BASE_SEPOLIA_COUNCIL_ADDRESS` |
| 最初のdeployment block | `BASE_SEPOLIA_DEPLOYMENT_BLOCK` |

併せて`BASE_SEPOLIA_PUBLIC_RPC_URL`を読み取り専用の公開RPC、`BASE_SEPOLIA_JPYC_DECIMALS`を`18`、`BASE_SEPOLIA_TAMAGAKI_METADATA_VERSION`を`2`にします。Actionsを再実行すると、デモと集計ページにEthereum Sepolia / Base Sepoliaの切替が表示されます。

### Base ETH / Polygon JPYC本番候補module

コードには次の専用Ignition moduleを用意しています。

| module | chain拘束 | Vaultの固定モード | 許可資産 |
|---|---:|---|---|
| `BaseEthRecoverySupport.ts` | Base Mainnet `8453` | `NativeOnly` | ETHのみ |
| `PolygonJpycRecoverySupport.ts` | Polygon PoS `137` | `ERC20Only` | 公式JPYC `0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29`のみ |

`RecoverySupportVault`はconstructorで期待chain IDを検査し、デプロイ後も`AssetMode`に反する資産追加を拒否します。Base VaultへERC-20、Polygon Vaultへnative assetを管理者が追加することもできません。USDCはallowlistにもmoduleにも含めません。

実際の本番デプロイ前にexampleを秘密情報を含まない作業用ファイルへ複製し、組織Safe、登録事業者入金先、reporter、有限上限を二人で確認します。`base-mainnet.json`と`polygon-mainnet.json`はgitignore対象です。

```bash
cp ignition/parameters/base-mainnet.example.json ignition/parameters/base-mainnet.json
cp ignition/parameters/polygon-mainnet.example.json ignition/parameters/polygon-mainnet.json
npx hardhat keystore set BASE_MAINNET_RPC_URL
npx hardhat keystore set POLYGON_MAINNET_RPC_URL
npx hardhat keystore set MAINNET_DEPLOYER_PRIVATE_KEY
npm run contracts:deploy:production:base
npm run contracts:deploy:production:polygon
```

このコマンドが存在することは本番開始の承認を意味しません。監査、関係者合意、Safe/timelock、Baseエスケープハッチ、Polygon停止・回収訓練が完了するまで実行しません。各chainで発行したSBTは`chainId:sbtContract:tokenId`をglobal IDとして統合します。

## 実装上の境界

- `RecoverySupportVault`のオンチェーン送金先は、認定NPOが契約する登録金融・決済事業者の入金アドレスに限定します。初期本番候補では支援資産はNPOへ帰属し、円転後の銀行送金はNPOから熊本県への別個の円貨寄附です。
- 本番候補moduleとBase Mainnet・Polygon Mainnet接続設定は実装済みですが、本番アドレスは未デプロイです。エスケープハッチ、Polygon回収runbook、本番Indexerは未実装です。
- 玉垣SBTは通常のウォレット間移転を禁止し、支援と同じchainで発行します。Indexerは`chainId:sbtContract:tokenId`でBase版とPolygon版を統合します。
- 本番系では氏名、住所、正確な位置情報などの個人情報をオンチェーンへ保存しません。Sepoliaの画像付きSBTデモだけは、明示的に同意した任意表示名とメッセージをオンチェーンへ記録できます。
- Councilの投票は参考情報であり、熊本県の予算や公共事業を拘束しません。
- 本番導入には、外部監査、マルチシグ、タイムロック、正式な受領合意、Polygon chain ID `137`と公式JPYCアドレス・codehash・decimalsの確認が必要です。

## セキュリティ強化版の仕様

- ERC-20は許可時のcodehash、symbol、decimalsを固定し、入金前後のVault残高差分を実受領額として記録します。
- constructorは期待chain IDと`Mixed / NativeOnly / ERC20Only`を固定し、誤chainへのデプロイと資産種別の後付け変更を拒否します。
- 資産ごとにVault残高、1 batch、1日の送付上限を設定します。デモの既定値は動作確認用であり、本番では有限値が必須です。
- `transferBatch`は`supportRoot`、`instructionHash`、`validUntil`を必須とし、同じ`batchId`の再利用と期限切れを拒否します。
- `beneficiary`変更は提案後2日待って実行し、pauseとunpauseは別ロールです。初期adminから組織マルチシグへロールを移す作業はデプロイ後に必要です。
- SBTは支援者本人にだけ発行でき、参考投票は提案作成時のtoken ID cutoff以前かつInvalidatedでないSBTを検証します。
- Registryの誤記は削除・上書きせず、後継attestationへの参照で訂正履歴を残します。

関連する設計判断は、[ADR一覧](./adr/)と[システム構造](./architecture)で確認できます。

## 玉垣SBTの技術仕様

### 標準と譲渡制限

- ベース規格はERC-721、Soulboundの検出にはERC-5192を使用します。`supportsInterface(0xb45a3c0e)`は`true`を返します。
- コレクション名は`Kumamoto Digital Tamagaki`、シンボルは`KDT`、token IDは1から連番です。
- `MINTER_ROLE`を持つVaultだけが発行します。mintとburn以外の`transferFrom`、`safeTransferFrom`は`Soulbound`エラーで失敗します。
- `locked(tokenId)`は存在するtokenについて常に`true`を返し、発行時にERC-5192の`Locked`イベントを記録します。

### 発行データ

各tokenは支援照合用の`supportId`、公開メタデータ照合用の`publicMetadataHash`、支援状態と、次の画像データを保持します。

| フィールド | 型 | 制限・意味 |
|---|---|---|
| `displayName` | `string` | 最大72 UTF-8 bytes。UIでは空欄から実名または本人が決めたニックネームを入力 |
| `dedicationMessage` | `string` | 最大180 UTF-8 bytes |
| `assetLabel` | `string` | 最大16 UTF-8 bytes。VaultがETHまたは許可済みERC-20から設定 |
| `amount` | `uint256` | `msg.value`またはVaultが実際に受領したtoken量。利用者入力を採用しない |
| `assetDecimals` | `uint8` | 最大18。人間向け金額表記に使用 |
| `showAmount` | `bool` | SVGで金額を表示するか。支援イベントの金額は非表示にならない |

制御文字は拒否し、SVGへ入れる文字列はXMLエスケープ、JSONへ入れる文字列はJSONエスケープします。デモUIはさらに表示名20文字、メッセージ50文字へ制限します。

### 発行インターフェース

画像付き発行では次の関数を使用します。

```solidity
supportNativeWithMetadata(bytes32 countryCodeHash, bytes32 messageHash, address sbtRecipient,
  bytes32 publicMetadataHash, ArtworkInput artwork)

supportERC20WithMetadata(IERC20 token, uint256 amount, bytes32 countryCodeHash,
  bytes32 messageHash, address sbtRecipient, bytes32 publicMetadataHash,
  ArtworkInput artwork)

mintWithMetadata(address to, bytes32 supportId, bytes32 publicMetadataHash,
  Artwork artwork)
```

従来の`supportNative`、`supportERC20`、`mint`も後方互換のため残し、画像データを持たないtokenには設定された`baseURI`を返します。画像データは発行後に変更できません。`updatePublicMetadataHash`は照合用hashだけを更新し、SVG画像は更新しません。

### `tokenURI`と画像

画像付きtokenの`tokenURI`は`data:application/json;base64,...`です。JSONには名称、説明、`data:image/svg+xml;base64,...`形式の画像、資産・金額・Soulbound属性を含みます。SVGは支援額にかかわらず同寸法の朱塗りの縦板とし、黒い見出し、token ID、縦書き表示名、表示を選択した場合の実受領額、奉納メッセージ、SBT証明印を合成します。多数の画像は横方向へ連続させ、熊本城を取り囲む垣根として表示します。外部画像サーバーやIPFSが停止しても、チェーンデータだけで各画像を再現できます。

`publicMetadataHash`はUIが編集値から作る正規化JSONのhashで、支援前プレビューと発行結果の照合に使います。ただし同意はコントラクトだけでは検証できず、コントラクトを直接呼ぶ利用者はUIを経由しません。個人情報保護をフロントエンドだけに依存できないため、本番では画像付き関数を採用するかを別途判断します。詳細は[ADR-0005](./adr/0005-privacy-and-public-data)を参照してください。

## トップページのオンチェーン集計

トップページはViemの読み取り専用Public Clientを使用し、`RecoverySupportVault`の`SupportReceived`イベントを30秒ごとに取得します。各イベントのブロック時刻と資産アドレスから、ETH・JPYCの累計額と支援件数を算出します。テストネットの集計とSBT一覧はデモ状況ページへ分離します。

GitHub Pagesでは従来の`RECOVERY_*`変数をEthereum Sepoliaとして利用できます。Base Sepoliaを併用する場合は、`BASE_SEPOLIA_PUBLIC_RPC_URL`、`BASE_SEPOLIA_VAULT_ADDRESS`、`BASE_SEPOLIA_JPYC_ADDRESS`、`BASE_SEPOLIA_TAMAGAKI_SBT_ADDRESS`、`BASE_SEPOLIA_REGISTRY_ADDRESS`、`BASE_SEPOLIA_COUNCIL_ADDRESS`、`BASE_SEPOLIA_DEPLOYMENT_BLOCK`、`BASE_SEPOLIA_JPYC_DECIMALS`、`BASE_SEPOLIA_TAMAGAKI_METADATA_VERSION=2`をGitHub Actions Variablesへ追加します。三つの主要アドレスが揃った場合だけBase Sepoliaが選択欄へ現れ、ネットワーク間の集計は分離されます。秘密鍵や書き込み権限はPagesへ設定しません。
