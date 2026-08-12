# ADR-0012: Lightning募金受付のインバウンド流動性と必要BTC

- 状態: Proposed
- 日付: 2026-08-12

## 文脈

Lightningで継続的に支援金を受け取るには、LND walletへBTCを入れるだけでは足りない。受付nodeが自己資金で通常のchannelを開くと、その資金は当初は送金方向のoutbound liquidityとなり、支援者から受け取るためのinbound liquidityにはならない。募金総額と同額を運営主体が恒久的に保有する必要はないが、次回の再調整までに見込む流入を処理できる実効inbound liquidity、オンチェーン手数料、channel reserve、Loopまたは流動性調達の費用が必要になる。

災害発生直後には平常時を大きく上回る流入があり得る。容量不足のままinvoiceを発行すると、支援者側では経路探索や残高不足による失敗に見える。反対に過大なhot balanceをLNDへ置くと、online channel key、macaroon、node侵害時の損失上限が増える。

## 決定

### 1. 必要BTCの定義

Lightning経路の運用能力を、単なるLND wallet残高やchannel額面ではなく、次の値に分けて管理する。

- 実効inbound liquidity: 現時点で外部から受付nodeへ到達可能と確認した受取方向の容量
- outbound liquidity: Loop Out、再調整、試験送金等に利用できる送金方向の容量
- on-chain reserve: channel開閉、sweep、fee bump、Loop、障害回復に使う確認済みUTXO
- hot balance: LNDのon-chain walletと全channelのlocal balanceの合計
- 調達済み他者資本: 相手nodeが開設したchannelまたは契約により提供されたinbound liquidity

運営主体が準備すべきBTCは調達方法で異なる。相手nodeからchannelを開いてもらう、または流動性を購入する場合、運営主体はchannel容量全額ではなく利用料とon-chain reserveを負担する。自己資金でchannelを開きLoop Outする場合、目標inboundと同程度のBTCを一時的に用意するが、Loop Out後の元本の多くはon-chain側へ戻る。いずれも手数料、reserve、価格・流動性変動、処理中のロックを別に見込む。

### 2. 容量算定

必要な実効inbound liquidityは、少なくとも次で算定する。

$$
I_{required}=P_{peak}(1+M)+R
$$

- $P_{peak}$: 次回再調整までに受け付ける最大予想額
- $M$: 経路偏り、予測誤差、障害に対する安全余裕
- $R$: channel reserve、未処理HTLC、手数料等の運用余裕

初期推計では簡易式`再調整までの最大予想額 × 1.5〜2.0`を使用できる。ただし本番値は、test環境および限定運用で得たinvoice分布、決済成功率、経路、Loop所要時間、fee実績を基に法人承認する。BTCの法定通貨価格を容量算定の唯一の基準にしない。

### 3. 限定公開時の提案初期値

次は本番承認済みの固定値ではなく、関係者協議と試験の開始点とする。

| 項目 | 提案初期値 |
|---|---:|
| 実効inbound liquidity | `0.05〜0.10 BTC` |
| 接続先 | 独立性と到達性を確認した3〜5 node |
| 1 invoice上限 | `100,000〜500,000 sat` |
| on-chain reserve | `0.01〜0.03 BTC` |
| 警戒水準 | 実効inbound残量40% |
| 高額invoice停止 | 実効inbound残量25%以下 |

外部からinbound liquidityを調達する場合の自己資金目安は`0.01〜0.03 BTC + 調達・再調整手数料`とする。自己資金でchannelを開きLoop Outする方式では、初期目標に対して一時的に概ね`0.07〜0.12 BTC`を必要とする可能性がある。これらは価格保証、必要十分性、または運営主体の保有義務を示す値ではない。

### 4. channel構成

- 「支援者ごとの募金channel」は作らない。受付nodeを複数の到達性の高いpeerへ接続し、一回限りのBOLT 11 invoiceを支援Intentごとに発行する。
- 単一peerまたは単一流動性事業者へ依存せず、少なくとも3系統へ分散する。
- 額面容量ではなく各channelのremote balance、pending HTLC、active状態、実際のprobe／少額invoice成功を監視する。
- private channelだけを利用する場合はinvoiceへroute hintを含める。公開channelとprivate channelの採否は支援者の到達性とnode秘匿性を比較して決める。
- 非Wumbo／Wumbo、最小・最大channel額、confirmation数、相手nodeの受入条件を事前確認し、一つの巨大channelで容量を確保しない。

### 5. 流動性の調達と再調整

優先順位は次のとおりとする。

1. 契約・本人性・会計処理を確認した複数peerまたは決済事業者からinbound liquidityを調達する。
2. Loop Out等のnon-custodial swapで受領済みlocal balanceをon-chainへ移し、inboundを回復する。
3. 必要に応じて追加channelを調達する。
4. 容量回復が間に合わない場合はLightningの新規invoice発行を縮退または停止し、Native Bitcoin経路を案内する。

自動再調整を採用する場合も、1回・1日・月間のfee budget、最小残高、最大slippage、許可サービス、失敗回数、手動承認へ切り替える条件を設定する。Loop／流動性市場の可用性を前提に受付継続を保証しない。

### 6. 受付制御

- invoice発行前に、金額を満たす実効inbound、node同期、peer数、channel active状態、LND hot balance上限を確認する。
- 1 invoice上限、1時間・1日の発行額、未決済invoice総額を設定する。未決済invoiceの額をすべて同時に支払われ得る予約容量として扱う。
- Lightning容量を超える支援にはNative Bitcoinを案内し、複数invoiceへの恣意的分割を標準導線にしない。
- 残容量不足を支援者のwallet障害として表示せず、「Lightning受付容量を調整中」と明示する。
- invoiceを発行済みでも決済成功を保証せず、`SETTLED`を確認するまで受領済みとして集計・アテステーションしない。

### 7. hot balanceと鍵管理

- LND hot balance上限はinbound目標とは別に設定する。受領で増えたlocal balanceを放置せず、金額または保管期限のいずれかが閾値へ達した時点で、承認済みLoop Outまたはsweep手順により固定allowlistのBitcoin hardware multisigへ移す。このmultisigをAccepted BTCの唯一の長期保管先とする。
- LNDのonline channel key、wallet、限定macaroonをBitcoin長期保管multisig、EVM管理鍵、アテステーション鍵と分離する。
- Web/APIへ`admin.macaroon`を置かず、invoice発行・照会・購読だけを許可する限定macaroonを使う。
- channel backup、node停止、force close、peer消失、fee急騰、Loop障害を含む復旧訓練を行う。

### 8. 監視指標と開始条件

次を記録し、公開情報と内部監視を分ける。

- channel別・全体の実効inbound／outbound
- active channel数とpeer／事業者集中度
- invoice発行額、未決済予約額、settled額、失敗率と失敗分類
- 再調整回数、所要時間、routing・swap・miner fee
- LND hot balance、on-chain reserve、hardware multisigへのsweep額
- 最終Bitcoin block、LND同期、invoice購読cursor

Lightning本番開始にはADR-0011・0013の条件に加え、流動性提供者または決済事業者との契約、有限な各上限、容量不足時のNative Bitcoin縮退、再調整とforce-closeの訓練、認定NPO管理のhardware multisigへのsweep試験、会計・法務確認を必須とする。

## 却下した案

### 自己資金で大容量channelを1本だけ開く

初期状態では主にoutboundとなり募金受付能力を確保できず、単一peer障害と経路偏りが大きいため採用しない。

### 募金見込総額と同額をLNDへ常時保管する

資本効率が低くonline key侵害時の損失上限を増やす。再調整周期と縮退経路を用いてhot balanceを制限する。

### 容量不足でもinvoiceを無制限に発行する

同時決済時に支払い失敗を誘発し、災害時の支援機会と信頼を損なうため採用しない。

## 結果

Lightning受付の必要BTCを説明可能な運用指標として管理できる一方、監視、流動性契約、再調整、fee budget、縮退制御が追加で必要になる。提案初期値は限定運用のための仮説であり、開始前に実測値、BTC価格・fee環境、契約条件、法人の損失許容度を用いて再承認する。初期production releaseでLightningを無効とするADR-0011の決定は変更しない。

## 関連ADR

- [ADR-0001](./0001-production-system-functional-spec.md): 本番機能仕様
- [ADR-0003](./0003-fund-governance-and-custody.md): Bitcoin資金管理と法的主体
- [ADR-0006](./0006-security-boundaries-and-verifiable-batches.md): 資金滞留と上限
- [ADR-0007](./0007-threat-model-and-human-error-controls.md): 攻撃・障害・操作ミス
- [ADR-0008](./0008-certified-npo-joint-operation.md): 認定NPOと登録事業者
- [ADR-0011](./0011-bitcoin-lightning-and-base-sbt.md): Lightning受付、鍵、SBTアテステーション
- [ADR-0013](./0013-lightning-legal-classification-and-abuse-controls.md): Lightning寄附の法的分類と悪用防止
