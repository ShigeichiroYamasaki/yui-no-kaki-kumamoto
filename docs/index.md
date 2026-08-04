---
layout: false
title: 熊本災害支援DAO Whitepaper
description: 世界から熊本へ。検証可能な復興支援基盤の設計。
head:
  - - meta
    - name: theme-color
      content: "#101b18"
  - - meta
    - property: og:title
      content: 熊本災害支援DAO Whitepaper
  - - meta
    - property: og:description
      content: 世界から熊本へ。検証可能な復興支援基盤の設計。
  - - meta
    - property: og:image
      content: https://shigeichiroyamasaki.github.io/yui-no-kaki-kumamoto/kumamoto-tamagaki-hero.png
---

<nav class="home-nav" aria-label="トップページナビゲーション">
  <a class="home-nav__brand" href="./">熊本災害支援DAO</a>
  <div class="home-nav__links">
    <a href="./vision">ホワイトペーパー</a>
    <a href="./architecture">技術設計</a>
    <a href="./smart-contracts">コントラクト</a>
    <a href="./prefecture-operations">NPO・県運用</a>
    <a href="./mainnet-status">支援状況</a>
    <a href="./adr/">ADR</a>
  </div>
  <div class="home-nav__languages" aria-label="表示言語">
    <a href="./" aria-current="page">日本語</a>
    <a href="./en/" lang="en">English</a>
  </div>
</nav>

<div class="whitepaper-hero">
  <div class="whitepaper-hero__copy">
    <div class="fundraising-notice" role="status"><strong>まだ募金を受け付けていません</strong><span>現在は構想・技術検証段階です。テストネットデモでは実資産を使用しません。</span></div>
    <div class="whitepaper-hero__eyebrow">KUMAMOTO RELIEF DAO / RECOVERY SUPPORT</div>
    <h1>熊本災害支援DAO <span>世界の想いを、熊本の復興力へ。</span></h1>
    <p>国内外から届く復興支援をデジタル玉垣として可視化し、資金が熊本県へ届き、インフラ復旧へつながる過程を誰もが検証できる公共的な支援基盤。</p>
    <div class="hero-actions">
      <a href="./vision">ホワイトペーパーを読む</a>
      <a href="./architecture">技術構造を見る</a>
      <a href="./smart-contracts">コントラクトを見る</a>
      <a href="./adr/">ADRを確認する</a>
      <a href="./wallet-experience">テストネットデモを始める</a>
    </div>
  </div>
</div>

<main class="whitepaper-home">
  <MainnetSupportTrend locale="ja" network="base" />
  <MainnetSupportTrend locale="ja" network="polygon" />
  <p class="whitepaper-hero__eyebrow">EXECUTIVE SUMMARY</p>
  <h2>支援の入口から、復興の報告まで。</h2>
  <p>熊本災害支援DAOは、認定NPOを法的運営主体とし、ETH・JPYCによる災害復興支援、譲渡不能な玉垣SBT、登録金融・決済事業者を介した円転と熊本県災害支援口座への円貨寄附、受領証跡、復興事業の進捗報告を一つの検証可能な流れとして接続する構想です。税制優遇を提供する仕組みではなく、インフラ復旧を目的とする純粋な復興支援を対象とします。</p>
  <section class="principles">
    <article><b>検証可能性</b><span>支援受付、集約送金、県受領、復興報告の重要な証跡を公開検証できる形で結びます。</span></article>
    <article><b>公共性の尊重</b><span>DAOは意見表明の場です。支援者投票が熊本県の予算や公共事業を拘束することはありません。</span></article>
    <article><b>プライバシー</b><span>本番では個人情報をオンチェーンへ保存しません。画像付きテストネットデモの任意表示名は、永続公開への明示同意がある場合だけ記録します。</span></article>
  </section>
  <h2>全体の流れ</h2>
  <div class="flow-strip"><span>認定NPOへ支援</span><span>玉垣SBT発行</span><span>登録事業者が円転</span><span>NPOが県へ円貨寄附</span><span>復興状況を報告</span></div>
  <h2>Whitepaper chapters</h2>
  <section class="chapter-grid">
    <a href="./vision"><b>01</b><span>ビジョンと設計原則</span></a>
    <a href="./architecture"><b>02</b><span>システム構造</span></a>
    <a href="./fund-flow"><b>03</b><span>支援と資金フロー</span></a>
    <a href="./tamagaki-sbt"><b>04</b><span>玉垣SBT</span></a>
    <a href="./transparency"><b>05</b><span>透明性とデータ</span></a>
    <a href="./governance"><b>06</b><span>ガバナンス</span></a>
    <a href="./environments"><b>07</b><span>本番系とデモ系</span></a>
    <a href="./roadmap"><b>08</b><span>ロードマップ</span></a>
    <a href="./risks"><b>09</b><span>リスクと免責</span></a>
    <a href="./wallet-experience"><b>UX</b><span>ウォレットから支援し玉垣SBTを受け取る</span></a>
    <a href="./prefecture-operations"><b>OPS</b><span>認定NPOと熊本県の資金移転・鍵管理手順</span></a>
    <a href="./smart-contracts"><b>CODE</b><span>スマートコントラクトとソースコード</span></a>
    <a href="./mainnet-status"><b>MAINNET</b><span>本番支援の受付状況</span></a>
    <a href="./demo-status"><b>TESTNETS</b><span>Ethereum / Base Sepoliaの支援・SBTを同時表示</span></a>
    <a href="./adr/"><b>ADR</b><span>設計判断の一覧と原記録を確認</span></a>
  </section>
  <div class="scope-note"><strong>現在の位置づけ</strong><br>本書は関係者協議前の提案・技術検証版です。掲載されたデモは実資金、実JPYC、熊本県のシステムへ接続しておらず、熊本県による承認を示すものではありません。</div>
</main>
