# Architecture Decision Records

| ADR | 状態 | 内容 |
|---|---|---|
| [0001](0001-production-system-functional-spec.md) | Proposed | 本番系の機能仕様 |
| [0002](0002-demo-system-functional-spec.md) | Accepted | UI説明デモとEthereum Sepolia統合デモの機能仕様 |
| [0003](0003-fund-governance-and-custody.md) | Proposed | 資金管理とDAOガバナンスの分離 |
| [0004](0004-chain-sbt-and-attestation.md) | Proposed | Base ETH、Polygon JPYC、マルチチェーンSBT、アテステーション |
| [0005](0005-privacy-and-public-data.md) | Accepted | 個人情報と公開データ |
| [0006](0006-security-boundaries-and-verifiable-batches.md) | Proposed | セキュリティ境界、資金滞留、検証可能な送金バッチ |
| [0007](0007-threat-model-and-human-error-controls.md) | Proposed | 攻撃、操作ミス、内部不正を共通制御で抑止する脅威モデル |
| [0008](0008-certified-npo-joint-operation.md) | Proposed | 認定NPOを法的主体とする共同運営、資金帰属、規制金融機能の分離 |
| [0009](0009-l2-selection-and-escape-hatch.md) | Proposed | L2の選定基準、finality表示、L1からの資金退出と訓練 |
| [0010](0010-multichain-demo-deployment-and-observability.md) | Accepted | マルチチェーンデモのデプロイ、RPC、Faucet、Pages、集計UIの再発防止 |
| [0011](0011-bitcoin-lightning-and-base-sbt.md) | Proposed | Native Bitcoin・Lightning支援、閾値アテステーション、Base玉垣SBT |

本番系ADRの`Proposed`は、熊本県、JPYC、登録金融・決済事業者、具体的な認定NPO、法律・会計専門家との合意前であることを示します。
