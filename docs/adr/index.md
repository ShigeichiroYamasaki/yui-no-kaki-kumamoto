# Architecture Decision Records

熊本災害支援DAOの本番系・デモ系を支える設計判断の一覧です。各ADRを選択すると、背景、採用した方針、理由、未決事項を確認できます。

| ADR | 状態 | 内容 |
|---|---|---|
| [ADR-0001](./0001-production-system-functional-spec.md) | Proposed | 本番系の機能仕様 |
| [ADR-0002](./0002-demo-system-functional-spec.md) | Accepted | UI説明デモとEthereum Sepolia統合デモの機能仕様 |
| [ADR-0003](./0003-fund-governance-and-custody.md) | Proposed | 資金管理とDAOガバナンスの分離 |
| [ADR-0004](./0004-chain-sbt-and-attestation.md) | Proposed | チェーン、SBT、アテステーション |
| [ADR-0005](./0005-privacy-and-public-data.md) | Accepted | 個人情報と公開データ |
| [ADR-0006](./0006-security-boundaries-and-verifiable-batches.md) | Proposed | セキュリティ境界、資金滞留、検証可能な送金バッチ |
| [ADR-0007](./0007-threat-model-and-human-error-controls.md) | Proposed | 攻撃、操作ミス、内部不正を共通制御で抑止する脅威モデル |
| [ADR-0008](./0008-certified-npo-joint-operation.md) | Proposed | 認定NPOを法的主体とする共同運営、資金帰属、規制金融機能の分離 |

## 状態の意味

- `Accepted`: プロトタイプの設計として採用済み
- `Proposed`: 関係者との協議・監査前の提案

本番系ADRの`Proposed`は、熊本県、JPYC、登録金融・決済事業者、具体的な認定NPO、法律・会計専門家との合意前であることを示します。

[ホワイトペーパーのトップへ戻る](../index.md)
