# Architecture Decision Records

熊本災害支援DAOの本番系・デモ系を支える設計判断の一覧です。各ADRを選択すると、背景、採用した方針、理由、未決事項を確認できます。

| ADR | 状態 | 内容 |
|---|---|---|
| [ADR-0001](./0001-production-system-functional-spec.md) | Proposed | 本番系の機能仕様 |
| [ADR-0002](./0002-demo-system-functional-spec.md) | Accepted | UI説明デモとEthereum Sepolia統合デモの機能仕様 |
| [ADR-0003](./0003-fund-governance-and-custody.md) | Proposed | 資金管理とDAOガバナンスの分離 |
| [ADR-0004](./0004-chain-sbt-and-attestation.md) | Proposed | Base ETH、Polygon JPYC、マルチチェーンSBT、アテステーション |
| [ADR-0005](./0005-privacy-and-public-data.md) | Accepted | 個人情報と公開データ |
| [ADR-0006](./0006-security-boundaries-and-verifiable-batches.md) | Proposed | セキュリティ境界、資金滞留、検証可能な送金バッチ |
| [ADR-0007](./0007-threat-model-and-human-error-controls.md) | Proposed | 攻撃、操作ミス、内部不正を共通制御で抑止する脅威モデル |
| [ADR-0008](./0008-certified-npo-joint-operation.md) | Proposed | 認定NPOを法的主体とする共同運営、資金帰属、規制金融機能の分離 |
| [ADR-0009](./0009-l2-selection-and-escape-hatch.md) | Proposed | L2の選定基準、finality表示、L1からの資金退出と訓練 |
| [ADR-0010](./0010-multichain-demo-deployment-and-observability.md) | Accepted | マルチチェーンデモのデプロイ、RPC、Faucet、Pages、集計UIの再発防止 |
| [ADR-0011](./0011-bitcoin-lightning-and-base-sbt.md) | Proposed | Native Bitcoin・Lightning支援、閾値アテステーション、Base玉垣SBT |
| [ADR-0012](./0012-lightning-inbound-liquidity-and-channel-capital.md) | Proposed | Lightning募金受付のinbound liquidity、必要BTC、再調整、縮退制御 |
| [ADR-0013](./0013-lightning-legal-classification-and-abuse-controls.md) | Proposed | Lightning寄附受付の法的分類、AML・制裁、不当勧誘、悪用防止 |
| [ADR-0014](./0014-trisa-centered-vasp-travel-rule-network.md) | Proposed | 国内登録VASPのNPO専用受取口座、段階的Travel Rule対応、PII保護 |

## 状態の意味

- `Accepted`: プロトタイプの設計として採用済み
- `Proposed`: 関係者との協議・監査前の提案

本番系ADRの`Proposed`は、熊本県、JPYC、登録金融・決済事業者、具体的な認定NPO、法律・会計専門家との合意前であることを示します。

[ホワイトペーパーのトップへ戻る](../index.md)
