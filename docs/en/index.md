---
layout: false
title: Kumamoto Relief DAO Whitepaper
description: From the world to Kumamoto. A verifiable recovery support platform.
head:
  - - meta
    - name: theme-color
      content: "#101b18"
  - - meta
    - property: og:title
      content: Kumamoto Relief DAO Whitepaper
  - - meta
    - property: og:description
      content: From the world to Kumamoto. A verifiable recovery support platform.
  - - meta
    - property: og:image
      content: https://shigeichiroyamasaki.github.io/yui-no-kaki-kumamoto/kumamoto-tamagaki-hero.png
---

<nav class="home-nav" aria-label="Homepage navigation">
  <a class="home-nav__brand" href="./">Kumamoto Relief DAO</a>
  <div class="home-nav__links">
    <a href="./vision">Whitepaper</a>
    <a href="./architecture">Architecture</a>
    <a href="./smart-contracts">Contracts</a>
    <a href="./prefecture-operations">Operations</a>
    <a href="./mainnet-status">Support status</a>
    <a href="https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto">GitHub</a>
  </div>
  <div class="home-nav__languages" aria-label="Display language">
    <a href="../" lang="ja">日本語</a>
    <a href="./" aria-current="page">English</a>
  </div>
</nav>

<div class="whitepaper-hero">
  <div class="whitepaper-hero__copy">
    <div class="fundraising-notice" role="status"><strong>Fundraising has not started</strong><span>This project is currently at the concept and technical validation stage. The testnet demo uses no real assets.</span></div>
    <div class="whitepaper-hero__eyebrow">KUMAMOTO RELIEF DAO / RECOVERY SUPPORT</div>
    <h1>Kumamoto Relief DAO <span>Turning global solidarity into Kumamoto's power to recover.</span></h1>
    <p>A public support platform that represents recovery contributions from Japan and abroad as digital tamagaki, enabling anyone to verify how funds reach Kumamoto Prefecture and contribute to infrastructure restoration.</p>
    <div class="hero-actions">
      <a href="./vision">Read the whitepaper</a>
      <a href="./architecture">View the architecture</a>
      <a href="./smart-contracts">View the contracts</a>
      <a href="./wallet-experience">Start the testnet demo</a>
    </div>
  </div>
</div>

<main class="whitepaper-home">
  <MainnetSupportTrend locale="en" network="base" />
  <MainnetSupportTrend locale="en" network="polygon" />
  <p class="whitepaper-hero__eyebrow">EXECUTIVE SUMMARY</p>
  <h2>From receiving support to reporting recovery.</h2>
  <p>Kumamoto Relief DAO proposes a certified NPO as legal operator and connects disaster recovery support in ETH and JPYC, non-transferable Tamagaki SBTs, conversion by a registered provider, a separate yen donation to the Kumamoto Disaster Support Account, proof of receipt, and recovery updates in one verifiable flow. It is not a tax-incentive scheme.</p>
  <section class="principles">
    <article><b>Verifiability</b><span>Key evidence for receipt, consolidated transfer, prefectural receipt, and recovery reporting is publicly linked and independently verifiable.</span></article>
    <article><b>Public mandate</b><span>DAO-style participation provides a channel for views. Supporter votes do not bind Kumamoto Prefecture's budgets or public works.</span></article>
    <article><b>Privacy</b><span>Production does not put personal data on-chain. An optional name in the image-enabled testnet demo is recorded only after explicit consent to permanent publication.</span></article>
  </section>
  <h2>End-to-end flow</h2>
  <div class="flow-strip"><span>Support the certified NPO</span><span>Tamagaki SBT</span><span>Registered conversion</span><span>NPO yen donation</span><span>Recovery reporting</span></div>
  <h2>Whitepaper chapters</h2>
  <section class="chapter-grid">
    <a href="./vision"><b>01</b><span>Vision and design principles</span></a>
    <a href="./architecture"><b>02</b><span>System architecture</span></a>
    <a href="./fund-flow"><b>03</b><span>Support and fund flow</span></a>
    <a href="./tamagaki-sbt"><b>04</b><span>Tamagaki SBT</span></a>
    <a href="./transparency"><b>05</b><span>Transparency and data</span></a>
    <a href="./governance"><b>06</b><span>Governance</span></a>
    <a href="./environments"><b>07</b><span>Production and demo systems</span></a>
    <a href="./roadmap"><b>08</b><span>Roadmap</span></a>
    <a href="./risks"><b>09</b><span>Risks and disclaimer</span></a>
    <a href="./wallet-experience"><b>UX</b><span>Contribute from a wallet and receive a Tamagaki SBT</span></a>
    <a href="./prefecture-operations"><b>OPS</b><span>NPO and prefectural key and settlement operations</span></a>
    <a href="./smart-contracts"><b>CODE</b><span>Smart contracts and source code</span></a>
    <a href="./mainnet-status"><b>MAINNET</b><span>Production fundraising status</span></a>
    <a href="./demo-status"><b>TESTNETS</b><span>View Ethereum and Base Sepolia data together</span></a>
  </section>
  <div class="scope-note"><strong>Current status</strong><br>This document is a proposal and technical prototype prepared before coordination with relevant parties. The demo is not connected to real funds, real JPYC, or any Kumamoto Prefecture system, and does not indicate endorsement by Kumamoto Prefecture.</div>
</main>
