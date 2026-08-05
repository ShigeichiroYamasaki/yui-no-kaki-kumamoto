# 4. 玉垣SBT

## 標準

玉垣は一件ごとの固有性を持つためERC-721を基礎とし、ERC-5192の`locked`インターフェースで譲渡不能性を表現します。譲渡、承認後の移転、二次流通をコントラクトで拒否します。

## マルチチェーン発行

EVM支援の玉垣SBTは支援資産と同じチェーンで発行します。Base上のETH支援にはBase版SBT、Polygon上のJPYC支援にはPolygon版SBTを同じ支援transaction内でmintします。

Native BitcoinとLightningは例外です。支援IntentごとのBitcoin outpointまたはLightning payment commitmentを複数の独立検証者が確認し、閾値アテステーションをBase Registryへ登録した後、支援者が支払い前に指定したBase addressへBase版SBTを発行します。元のLightning payment hashは公開しません。Bitcoinの支払いとSBT発行は非原子的であり、確認中の支払いを発行済みSBTとして表示しません。Bitcoin inscriptionは移転可能なUTXOに結び付くため正式なSBTには採用しません。

token IDはコントラクト内でのみ一意であるため、公開システムでは`chainId:sbtContract:tokenId`をglobal IDとして扱います。統合Indexerは各チェーン固有のfinalityを確認し、同じ`supportId`に複数の有効SBTがないことを検証してから、一つの玉垣ビューへ統合します。SBTの状態更新と送金batchも元のチェーンを明示します。

## 状態モデル

| 状態 | 意味 |
|---|---|
| `Received` | 支援トランザクションを受付済み |
| `Detected` | Bitcoin／Lightning支払いを検出したが未確定 |
| `Confirmed` | Bitcoin confirmationまたはLightning settlementを確認済み |
| `Accepted` | 閾値アテステーションと必要な確認を通過 |
| `Included` | 県送金バッチへ集約済み |
| `Delivered` | 熊本県災害支援口座への入金確認済み |
| `Reported` | 関連する復興報告が公開済み |
| `Invalidated` | 例外処理により失効 |

## メタデータ

デモの画像対応版では、ERC-721の`tokenURI`がJSONとBase64エンコードされたSVGをオンチェーンで返します。玉垣には、支援者が送金前に確定した表示名、任意メッセージ、実際に送金された資産・金額、SBT番号を合成します。金額は自由記述ではなく`SupportReceived`と同じ実額から生成します。

表示名と任意のメッセージは送金前にブラウザで編集・プレビューできます。表示名の初期値は空欄とし、支援者が実名または自分で決めたニックネームを入力します。公開同意を明示的に選択しない限り送金できません。オンチェーン公開後は完全に削除できないため、本番系ではオフチェーンの撤回可能な公開プロフィール方式も選択肢として残します。

入力内容の正規化JSONのハッシュは`publicMetadataHash`へ保存し、画像に使われた入力と支援トランザクションを検証可能にします。コントラクトは文字列長、制御文字、XMLエスケープを検査します。

## 表示体験

Base版、Polygon版、Bitcoin／Lightning由来のBase版を区別なく熊本城の周囲へ配置した俯瞰ビューを提供します。表示密度が高い場合は地域・期間・資産・チェーン・状態による集約表示を使い、個別玉垣を選択するとchain ID、SBTコントラクト、token ID、Bitcoin outpointまたはLightning payment commitment、閾値アテステーション、県送金バッチ、受領確認、復興報告を確認できます。

## 権利の否定

玉垣SBTは、所有権、返済請求権、配当、収益分配、税制優遇、公共事業への決定権を付与しません。支援参加の記録とコミュニティ上の非金銭的な証明です。
