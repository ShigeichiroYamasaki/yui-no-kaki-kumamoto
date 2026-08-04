# 3. 支援と資金フロー

## 支援受付

支援者はBase MainnetのETH VaultへETH、Polygon PoSのJPYC Vaultへ公式JPYCを送ります。各Vaultは同じchain上で玉垣SBTを発行します。コントラクトはゼロ金額、未許可資産、誤chain、停止中の受付を拒否し、chainを含む支援IDと受付イベントを発行します。

国、表示名、メッセージは任意です。国はウォレットやIPアドレスから推定せず、本人の申告だけを集計します。

## 集約と熊本県への移転

```mermaid
sequenceDiagram
  participant S as 支援者
  participant BV as Base ETH Vault
  participant PV as Polygon JPYC Vault
  participant O as 認定NPO財務マルチシグ
  participant E as 登録金融・決済事業者
  participant K as 熊本県災害支援口座
  participant R as Registry
  S->>BV: BaseでETH支援
  BV-->>S: 支援イベント + Base版玉垣SBT
  S->>PV: PolygonでJPYC支援
  PV-->>S: 支援イベント + Polygon版玉垣SBT
  O->>BV: chain固有batch IDでETHを集約
  O->>PV: chain固有batch IDでJPYCを集約
  BV->>E: ETHを移転
  PV->>E: JPYCを移転
  E->>K: NPOの別個の円貨寄附を送金
  K-->>R: 県受領・復興証憑ハッシュを登録
```

コントラクトは交換業務を行いません。支援成立時に資産は認定NPOへ確定的に帰属し、支援者別残高、交換、振替を提供しません。NPOは必要な登録・管理態勢を備えた事業者を介して自己資産を円転し、熊本県へ別個の円貨寄附を行います。県への直接JPYC寄附とは表示しません。

## 会計上の表示

公開画面では、資産別数量、ETH参考評価額、円転時の確定円貨額、熊本県への送金済み額、処理中額、残高、手数料を分離します。

基本整合式は次のとおりです。

$$
R = K + P + B + F
$$

ここで、$R$ は受領額、$K$ は熊本県への送金済み額、$P$ は処理中額、$B$ は残高、$F$ は明示手数料です。参考評価額を確定受領額として表示しません。

## 受領証跡

銀行証憑や行政文書そのものは公開チェーンへ置かず、文書ハッシュ、バッチID、円建て確定額、確認時刻を記録します。利用者は公開文書をハッシュ化し、オンチェーン記録と一致するか検証できます。
