# ADR-0009: L2選定とL1エスケープハッチ

- 状態: Proposed
- 日付: 2026-08-04

## 背景

ETHの少額支援とSBT発行の手数料を抑えるためBase Mainnetを本番候補とする。一方、sequencer、Data Availability、proof system、canonical bridge、upgrade authorityはL1直接利用にはない障害・信頼境界を増やす。通常のRPC切替や運営者のpauseだけでは、sequencerが停止・検閲した場合にVault資金をL1へ戻せない。本ADRはBase上のETH経路を対象とし、Polygon上のJPYCには適用しない。

## 決定

1. ETH受付の本番候補をBase Mainnetとし、JPYCはADR-0004に基づきPolygon PoSの別Vaultで受け付ける。
2. 選定時に、L1 Data Availability、forced transaction、canonical withdrawal、proof/challenge期間、upgrade権限、障害履歴、監視APIを評価する。
3. UIと会計は`pending`、`L2 confirmed`、`L1 finalized`を区別し、再編成可能なeventを確定残高や送金batchへ含めない。
4. 本番ではL1緊急マルチシグ、L2 Escape Controller、固定L1 Recovery Vault、L1 gas reserve、二重送金防止台帳を実装する。
5. 通常経路をpauseし、最終安全blockを固定してから、L1 forced transaction、canonical withdrawal、challenge/proof期間、L1受領、会計照合の順に回収する。
6. OP Stackではaddress aliasingとcross-domain authenticationを明示的に実装・試験し、L1メッセージ送信者とL2 Safeのアドレス同一性を仮定しない。
7. 独自zk-STARK/SNARKはアプリデータの検証には利用できるが、それ単独を資産エスケープハッチとは扱わない。採用L2のネイティブproof、Data Availability、canonical bridgeを利用する。
8. Base Sepoliaを代替公開デモネットワークとして維持し、forced transaction、canonical withdrawal、L1回収、通常経路との排他制御を訓練する。

## 発動条件と承認

- sequencerまたはbatch投稿が所定時間停止した場合
- 検閲、重大なbridge/proof脆弱性、upgrade鍵侵害が合理的に疑われる場合
- 複数RPCとL1状態の照合で安全な継続が確認できない場合

緊急pauseは即時実行できるが、エスケープ開始は独立したNPO財務担当・技術担当を含むL1マルチシグで承認する。最終安全block、対象資産・残高、withdrawal ID、challenge期限、L1受領transaction、二重送金防止状態を公開する。L1受領後も通常経路を自動再開しない。

## 本番移行条件

- ETHのcanonical withdrawal後にL1 Recovery Vaultと登録事業者が資産を受け付けることを確認する。
- L2とL1のコントラクト、マルチシグ、timelock、aliasing処理を外部監査する。
- testnetで完全退出訓練を行い、最大所要時間とL1 gas必要額を計測する。
- 通常送金と緊急退出の二重計上・二重送金が不変条件で排除されることを試験する。
- 半期ごと、およびbridge/protocol upgrade後に訓練を再実施する。

## トレードオフ

L2は手数料とUXを改善するが、bridge、sequencer、proof、upgrade governanceという追加リスクを導入する。エスケープハッチは資金回収可能性を高める一方、L1コントラクト、追加鍵、監視、長い退出待機、訓練費用を必要とする。回収不能な資産はL2で受け付けない。

## 現状

現行の`RecoverySupportVault`とデプロイmoduleはエスケープハッチを実装していない。Base Sepolia対応はネットワーク選択とデモの準備であり、本ADRの本番要件を満たしたことを意味しない。
