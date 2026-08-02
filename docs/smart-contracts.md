# スマートコントラクト

熊本災害支援DAOのスマートコントラクトは、ホワイトペーパーと同じGitHubリポジトリで公開・管理しています。現在の実装は関係者協議前のプロトタイプであり、実資金を受け付ける本番環境へはデプロイしていません。

[GitHubでソースコード全体を見る](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/tree/main/contracts)

## コントラクト構成

| コントラクト | 役割 | ソースコード |
|---|---|---|
| RecoverySupportVault | ETHと許可されたERC-20による支援を受け付け、指定受領先への資金移転を記録します。 | [RecoverySupportVault.sol](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/blob/main/contracts/RecoverySupportVault.sol) |
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

## 実装上の境界

- `RecoverySupportVault`の受領先は、管理権限によって指定されたアドレスに限定します。
- 玉垣SBTは通常のウォレット間移転を禁止し、支援参加の証しとして扱います。
- 本番系では氏名、住所、正確な位置情報などの個人情報をオンチェーンへ保存しません。Sepoliaの画像付きSBTデモだけは、明示的に同意した任意表示名とメッセージをオンチェーンへ記録できます。
- Councilの投票は参考情報であり、熊本県の予算や公共事業を拘束しません。
- 本番導入には、外部監査、マルチシグ、タイムロック、正式な受領合意、利用チェーン上の公式JPYCアドレス確認が必要です。

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
| `displayName` | `string` | 最大72 UTF-8 bytes。初期値は匿名を推奨 |
| `dedicationMessage` | `string` | 最大180 UTF-8 bytes |
| `assetLabel` | `string` | 最大16 UTF-8 bytes。VaultがETHまたは許可済みERC-20から設定 |
| `amount` | `uint256` | `msg.value`またはVaultが実際に受領したtoken量。利用者入力を採用しない |
| `assetDecimals` | `uint8` | 最大18。人間向け金額表記に使用 |
| `showAmount` | `bool` | SVGで金額を表示するか。支援イベントの金額は非表示にならない |

制御文字は拒否し、SVGへ入れる文字列はXMLエスケープ、JSONへ入れる文字列はJSONエスケープします。デモUIはさらに表示名20文字、メッセージ50文字へ制限します。

### 発行インターフェース

画像付き発行では次の関数を使用します。

```solidity
supportNativeWithMetadata(bytes32 supportId, bytes32 countryCode, address sbtRecipient,
  bytes32 publicMetadataHash, ArtworkInput artwork)

supportERC20WithMetadata(IERC20 token, uint256 amount, bytes32 supportId,
  bytes32 countryCode, address sbtRecipient, bytes32 publicMetadataHash,
  ArtworkInput artwork)

mintWithMetadata(address to, bytes32 supportId, bytes32 publicMetadataHash,
  Artwork artwork)
```

従来の`supportNative`、`supportERC20`、`mint`も後方互換のため残し、画像データを持たないtokenには設定された`baseURI`を返します。画像データは発行後に変更できません。`updatePublicMetadataHash`は照合用hashだけを更新し、SVG画像は更新しません。

### `tokenURI`と画像

画像付きtokenの`tokenURI`は`data:application/json;base64,...`です。JSONには名称、説明、`data:image/svg+xml;base64,...`形式の画像、資産・金額・Soulbound属性を含みます。SVGには玉垣の意匠、表示名、表示を選択した場合の実受領額、奉納メッセージ、token IDを合成します。したがって外部画像サーバーやIPFSが停止しても、チェーンデータだけで画像を再現できます。

`publicMetadataHash`はUIが編集値から作る正規化JSONのhashで、支援前プレビューと発行結果の照合に使います。ただし同意はコントラクトだけでは検証できず、コントラクトを直接呼ぶ利用者はUIを経由しません。個人情報保護をフロントエンドだけに依存できないため、本番では画像付き関数を採用するかを別途判断します。詳細は[ADR-0005](./adr/0005-privacy-and-public-data)を参照してください。

## トップページのオンチェーン集計

トップページはViemの読み取り専用Public Clientを使用し、`RecoverySupportVault`の`SupportReceived`イベントを30秒ごとに取得します。各イベントのブロック時刻と資産アドレスから、ETH・JPYCの累計額と支援件数を算出します。テストネットの集計とSBT一覧はデモ状況ページへ分離します。

GitHub Pagesのデプロイ時には、本番表示用の`MAINNET_RPC_URL`、`MAINNET_VAULT_ADDRESS`、`MAINNET_JPYC_ADDRESS`、`MAINNET_DEPLOYMENT_BLOCK`と、デモ表示用の`RECOVERY_RPC_URL`、`RECOVERY_VAULT_ADDRESS`、`JPYC_ADDRESS`、`RECOVERY_DEPLOYMENT_BLOCK`、`JPYC_DECIMALS`を環境別に設定します。画像付きデモの送信機能は`TAMAGAKI_METADATA_VERSION=2`の場合だけ有効です。秘密鍵や書き込み権限は使用しません。未設定時は仮データを表示せず、接続待ち状態になります。
