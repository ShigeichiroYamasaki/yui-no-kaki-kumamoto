# スマートコントラクト

結の垣のスマートコントラクトは、ホワイトペーパーと同じGitHubリポジトリで公開・管理しています。現在の実装は関係者協議前のプロトタイプであり、実資金を受け付ける本番環境へはデプロイしていません。

[GitHubでソースコード全体を見る](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/tree/main/contracts)

## コントラクト構成

| コントラクト | 役割 | ソースコード |
|---|---|---|
| RecoverySupportVault | ETHと許可されたERC-20による支援を受け付け、指定受領先への資金移転を記録します。 | [RecoverySupportVault.sol](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/blob/main/contracts/RecoverySupportVault.sol) |
| TamagakiSBT | 支援参加の証しとなる、ERC-721およびERC-5192型の譲渡不能な玉垣SBTを発行します。 | [TamagakiSBT.sol](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/blob/main/contracts/TamagakiSBT.sol) |
| RecoveryAttestationRegistry | 熊本県側の受領確認や復興事業報告について、文書ハッシュと参照情報を記録します。 | [RecoveryAttestationRegistry.sol](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/blob/main/contracts/RecoveryAttestationRegistry.sol) |
| RecoverySupportCouncil | SBT保有者による非拘束の参考投票を提供します。資金移動権限は持ちません。 | [RecoverySupportCouncil.sol](https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto/blob/main/contracts/RecoverySupportCouncil.sol) |
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
- 氏名、住所、正確な位置情報などの個人情報はオンチェーンへ保存しません。
- Councilの投票は参考情報であり、熊本県の予算や公共事業を拘束しません。
- 本番導入には、外部監査、マルチシグ、タイムロック、正式な受領合意、利用チェーン上の公式JPYCアドレス確認が必要です。

関連する設計判断は、[ADR一覧](./adr/)と[システム構造](./architecture)で確認できます。
