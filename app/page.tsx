"use client";

import { useMemo, useState } from "react";

type Support = {
  id: number;
  name: string;
  country: string;
  flag: string;
  asset: "JPYC" | "ETH";
  amount: number;
  yen: number;
  message: string;
  status: "Received" | "Included" | "Delivered" | "Reported";
  time: string;
};

type Project = {
  id: string;
  category: string;
  place: string;
  title: string;
  progress: number;
  allocation: number;
  update: string;
  date: string;
};

const initialSupports: Support[] = [
  { id: 12846, name: "HIKARI", country: "日本", flag: "🇯🇵", asset: "JPYC", amount: 30000, yen: 30000, message: "熊本の道が、また未来へつながりますように。", status: "Delivered", time: "たった今" },
  { id: 12845, name: "Maya K.", country: "アメリカ", flag: "🇺🇸", asset: "ETH", amount: .18, yen: 108000, message: "Standing with Kumamoto.", status: "Delivered", time: "2分前" },
  { id: 12844, name: "Team Kyushu", country: "日本", flag: "🇯🇵", asset: "JPYC", amount: 100000, yen: 100000, message: "一日も早い復旧を願っています。", status: "Included", time: "8分前" },
  { id: 12843, name: "匿名の支援者", country: "シンガポール", flag: "🇸🇬", asset: "ETH", amount: .05, yen: 30000, message: "From Singapore, with hope.", status: "Reported", time: "14分前" },
  { id: 12842, name: "Équipe Aso", country: "フランス", flag: "🇫🇷", asset: "ETH", amount: .12, yen: 72000, message: "Courage Kumamoto.", status: "Delivered", time: "21分前" },
  { id: 12841, name: "森田家", country: "日本", flag: "🇯🇵", asset: "JPYC", amount: 50000, yen: 50000, message: "強い熊本を、次の世代へ。", status: "Reported", time: "32分前" },
];

const initialProjects: Project[] = [
  { id: "KRI-2026-014", category: "道路・橋梁", place: "阿蘇地域", title: "県道28号・橋梁応急復旧", progress: 68, allocation: 12000000, update: "橋脚補強が完了し、路面復旧工程へ移行しました。", date: "2026.07.28" },
  { id: "KRI-2026-009", category: "上下水道", place: "上益城地域", title: "基幹送水管の復旧", progress: 42, allocation: 8400000, update: "損傷区間の交換工事を3工区で進めています。", date: "2026.07.24" },
  { id: "KRI-2026-003", category: "避難・防災", place: "八代地域", title: "避難拠点の非常電源強化", progress: 100, allocation: 5600000, update: "非常用発電設備の設置と稼働確認が完了しました。", date: "2026.07.18" },
];

const countryStats = [
  ["日本", "🇯🇵", 7924, 63],
  ["アメリカ", "🇺🇸", 1284, 26],
  ["シンガポール", "🇸🇬", 612, 18],
  ["フランス", "🇫🇷", 498, 15],
  ["台湾", "🇹🇼", 442, 13],
  ["オーストラリア", "🇦🇺", 317, 10],
] as const;

const timeline = [24, 31, 28, 46, 42, 58, 71, 54, 68, 83, 76, 92, 65, 79];
const statusLabel = { Received: "受付確認", Included: "集約済み", Delivered: "県受領済み", Reported: "復興報告あり" };

const yen = (value: number) => new Intl.NumberFormat("ja-JP").format(Math.round(value));

export default function Home() {
  const [supports, setSupports] = useState(initialSupports);
  const [projects, setProjects] = useState(initialProjects);
  const [supportOpen, setSupportOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [receipt, setReceipt] = useState<Support | null>(null);
  const [asset, setAsset] = useState<"JPYC" | "ETH">("JPYC");
  const [amount, setAmount] = useState("30000");
  const [country, setCountry] = useState("日本");
  const [displayName, setDisplayName] = useState("匿名の支援者");
  const [message, setMessage] = useState("熊本の復興を応援しています。");
  const [selectedProject, setSelectedProject] = useState(initialProjects[0].id);
  const [progress, setProgress] = useState("75");
  const [projectUpdate, setProjectUpdate] = useState("橋面の舗装工事を開始しました。");
  const [transferStage, setTransferStage] = useState<0 | 1 | 2>(2);

  const total = useMemo(() => 184320500 + supports.slice(initialSupports.length).reduce((sum, item) => sum + item.yen, 0), [supports]);
  const wallets = 12846 + Math.max(0, supports.length - initialSupports.length);
  const delivered = transferStage === 2 ? 160000000 : 145790000;
  const pending = total - delivered;

  function simulateSupport(event: React.FormEvent) {
    event.preventDefault();
    const numeric = Math.max(0, Number(amount));
    const countryInfo: Record<string, string> = { 日本: "🇯🇵", アメリカ: "🇺🇸", シンガポール: "🇸🇬", フランス: "🇫🇷", 台湾: "🇹🇼", その他: "🌏" };
    const item: Support = {
      id: 12846 + Math.max(1, supports.length - initialSupports.length + 1),
      name: displayName || "匿名の支援者",
      country,
      flag: countryInfo[country] || "🌏",
      asset,
      amount: numeric,
      yen: asset === "JPYC" ? numeric : numeric * 600000,
      message,
      status: "Received",
      time: "たった今",
    };
    setSupports([item, ...supports]);
    setSupportOpen(false);
    setReceipt(item);
  }

  function publishUpdate(event: React.FormEvent) {
    event.preventDefault();
    setProjects(projects.map((project) => project.id === selectedProject ? {
      ...project,
      progress: Math.min(100, Math.max(0, Number(progress))),
      update: projectUpdate,
      date: "2026.07.31",
    } : project));
    setAdminOpen(false);
  }

  return (
    <main>
      <div className="demo-ribbon"><b>INTERACTIVE PROTOTYPE</b><span>このサイトの資金・人物・事業はすべて説明用のサンプルです</span></div>

      <header className="site-header">
        <a className="brand" href="#top"><span className="brand-mark">熊</span><span><b>熊本災害支援DAO</b><small>KUMAMOTO RELIEF DAO</small></span></a>
        <nav>
          <a href="#world">世界からの支援</a>
          <a href="#funds">資金の流れ</a>
          <a href="#recovery">復興の進捗</a>
          <button className="nav-admin" onClick={() => setAdminOpen(true)}>県担当者デモ</button>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-bg" />
        <div className="hero-shade" />
        <div className="hero-copy">
          <p className="eyebrow">KUMAMOTO RECOVERY SUPPORT</p>
          <h1>世界の想いを、<br />熊本の力へ。</h1>
          <p>道路、橋梁、上下水道。暮らしを支えるインフラの復興へ。<br />支援が届き、未来へ変わるまでを見届けるデジタル玉垣。</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => setSupportOpen(true)}>支援を体験する <span>→</span></button>
            <a className="secondary" href="#funds">資金の流れを見る</a>
          </div>
        </div>

        <div className="live-card">
          <div className="live-title"><span className="pulse" /> LIVE DEMO <small>12秒前に更新</small></div>
          <strong>¥{yen(total)}</strong><span>累計復興支援額</span>
          <div className="live-grid">
            <div><b>{yen(wallets)}</b><small>支援ウォレット</small></div>
            <div><b>32</b><small>国と地域</small></div>
            <div><b>{yen(13102 + supports.length - initialSupports.length)}</b><small>支援件数</small></div>
          </div>
          <div className="progress-label"><span>熊本県へ送金済み</span><b>¥{yen(delivered)}</b></div>
          <div className="progress-track"><i style={{ width: `${Math.min(100, delivered / total * 100)}%` }} /></div>
        </div>

        <div className="tamagaki-row" aria-label="最近のデジタル玉垣">
          {supports.slice(0, 13).map((support, index) => (
            <button key={`${support.id}-${index}`} onClick={() => setReceipt(support)} style={{ "--i": index } as React.CSSProperties}>
              <small>{support.flag}</small><b>{support.name}</b><i>結</i>
            </button>
          ))}
        </div>
      </section>

      <section className="dashboard" id="world">
        <div className="section-head">
          <div><p className="eyebrow dark">SUPPORT FROM THE WORLD</p><h2>いま、この瞬間も。<br />世界から熊本へ。</h2></div>
          <p>支援者が任意で公開した国・地域と、ブロックチェーン上で確認された支援を集計するデモです。ウォレットから国を推測することはありません。</p>
        </div>

        <div className="world-grid">
          <article className="world-panel">
            <div className="panel-title"><b>世界の支援分布</b><span>過去30日</span></div>
            <div className="globe-field" aria-label="国別支援分布のイメージ">
              <div className="globe-ring one" /><div className="globe-ring two" />
              {countryStats.map(([name, flag, count, size], index) => (
                <button key={name} className={`country-dot d${index}`} style={{ "--size": `${size + 34}px` } as React.CSSProperties}>
                  <b>{flag}</b><span>{name}</span><small>{yen(count)} wallets</small>
                </button>
              ))}
              <span className="globe-note">32 COUNTRIES<br />CONNECTED</span>
            </div>
          </article>
          <article className="ranking-panel">
            <div className="panel-title"><b>国・地域別</b><span>支援ウォレット</span></div>
            <ol>
              {countryStats.map(([name, flag, count], index) => (
                <li key={name}><i>{String(index + 1).padStart(2, "0")}</i><span>{flag} {name}</span><b>{yen(count)}</b><em style={{ width: `${count / 7924 * 100}%` }} /></li>
              ))}
            </ol>
          </article>
        </div>

        <div className="trend-panel">
          <div className="panel-title"><b>支援の時間的推移</b><span>直近14日・円換算参考額</span></div>
          <div className="trend-summary"><strong>+18.4%</strong><span>前期間比</span><b>¥38,420,000</b><span>期間内支援</span></div>
          <div className="bars">
            {timeline.map((value, index) => <i key={index} style={{ height: `${value}%` }}><span>{index === 13 ? "今日" : `${index + 17}日`}</span></i>)}
          </div>
        </div>

        <div className="activity-head"><h3>届いたばかりの玉垣</h3><span><i className="pulse" /> リアルタイム更新</span></div>
        <div className="activity-list">
          {supports.slice(0, 6).map((support) => (
            <button key={support.id} onClick={() => setReceipt(support)}>
              <span className="activity-flag">{support.flag}</span>
              <span><b>{support.name}</b><small>{support.country} · {support.time}</small></span>
              <em>{support.asset === "JPYC" ? `${yen(support.amount)} JPYC` : `${support.amount} ETH`}</em>
              <i className={`status ${support.status}`}>{statusLabel[support.status]}</i>
              <span className="open-arrow">→</span>
            </button>
          ))}
        </div>
      </section>

      <section className="funds" id="funds">
        <div className="section-head light">
          <div><p className="eyebrow">TRACEABLE FUND FLOW</p><h2>集まった支援が、<br />熊本県へ届くまで。</h2></div>
          <p>受付、集約、円転、県指定口座への送金、受領確認を一つの画面で照合します。このデモではボタンで状態変化を再現できます。</p>
        </div>
        <div className="balance-cards">
          <article><span>累計受付</span><strong>¥{yen(total)}</strong><small>ETH参考評価額を含む</small></article>
          <article><span>熊本県へ送金済み</span><strong>¥{yen(delivered)}</strong><small>{transferStage === 2 ? "県受領確認済み" : "確認処理中"}</small></article>
          <article><span>次回送金予定残高</span><strong>¥{yen(pending)}</strong><small>トレジャリーで照合済み</small></article>
        </div>
        <div className="transfer-console">
          <div className="transfer-head"><div><span>集約送金</span><b>BATCH #00013</b></div><i className={transferStage === 2 ? "complete" : ""}>{transferStage === 2 ? "県受領確認済み" : "デモ進行中"}</i></div>
          <div className="transfer-steps">
            <article className="done"><i>✓</i><span><small>STEP 1</small><b>支援金を集約</b><em>14,210,000円相当</em></span></article>
            <span>→</span>
            <article className={transferStage >= 1 ? "done" : ""}><i>{transferStage >= 1 ? "✓" : "2"}</i><span><small>STEP 2</small><b>登録事業者で円転</b><em>{transferStage >= 1 ? "円転報告を受領" : "実行待ち"}</em></span></article>
            <span>→</span>
            <article className={transferStage >= 2 ? "done" : ""}><i>{transferStage >= 2 ? "✓" : "3"}</i><span><small>STEP 3</small><b>熊本県が受領</b><em>{transferStage >= 2 ? "受領記録を照合" : "確認待ち"}</em></span></article>
          </div>
          {transferStage < 2 ? (
            <button className="console-action" onClick={() => setTransferStage((transferStage + 1) as 1 | 2)}>
              {transferStage === 0 ? "円転完了をシミュレート" : "熊本県の受領確認をシミュレート"} <span>→</span>
            </button>
          ) : (
            <div className="receipt-line"><span>県受領記録</span><b>KUM-PREF-DEMO-2026-0013</b><span>証憑ハッシュ</span><b>0x8c31…71ae</b></div>
          )}
        </div>
      </section>

      <section className="recovery" id="recovery">
        <div className="section-head">
          <div><p className="eyebrow dark">FROM KUMAMOTO, WITH PROGRESS</p><h2>支援が変えた、<br />熊本の現在。</h2></div>
          <p>熊本県側の担当者が、事業の進捗、支援金充当額、写真や報告書を登録し、世界の支援者へ継続的にフィードバックする想定です。</p>
        </div>
        <div className="impact-summary">
          <div><strong>3</strong><span>公開中の復興事業</span></div>
          <div><strong>¥26,000,000</strong><span>支援金充当額</span></div>
          <div><strong>70%</strong><span>平均進捗率</span></div>
          <button onClick={() => setAdminOpen(true)}>復興報告を更新する <small>県担当者デモ</small></button>
        </div>
        <div className="project-grid">
          {projects.map((project) => (
            <article key={project.id} className="project-card">
              <div className={`project-visual p${project.id.slice(-1)}`}>
                <span>{project.category}</span><b>{project.progress}%</b><small>{project.progress === 100 ? "完了" : "進行中"}</small>
              </div>
              <div className="project-copy">
                <span>{project.place} · {project.id}</span>
                <h3>{project.title}</h3>
                <div className="project-progress"><i style={{ width: `${project.progress}%` }} /></div>
                <dl><div><dt>進捗</dt><dd>{project.progress}%</dd></div><div><dt>支援金充当</dt><dd>¥{yen(project.allocation)}</dd></div></dl>
                <blockquote>「{project.update}」</blockquote>
                <small>最終更新 {project.date}　·　熊本県デモ報告</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="architecture">
        <p className="eyebrow">HOW THE PROTOTYPE CONNECTS</p>
        <h2>支援の証と、復興の証を<br />ひとつの輪に。</h2>
        <div className="arch-flow">
          {[
            ["01", "支援を受け付ける", "ETH・JPYCの疑似支援"],
            ["02", "玉垣を発行", "譲渡不能な支援証明"],
            ["03", "熊本県へ送金", "集約・円転・受領確認"],
            ["04", "復興を報告", "事業進捗を世界へ還元"],
          ].map(([n, title, text], index) => <div key={n}><i>{n}</i><b>{title}</b><span>{text}</span>{index < 3 && <em>→</em>}</div>)}
        </div>
      </section>

      <footer>
        <div className="brand"><span className="brand-mark">熊</span><span><b>熊本災害支援DAO</b><small>KUMAMOTO RELIEF DAO</small></span></div>
        <p>熊本災害復興支援プロトタイプ</p>
        <small>実在の募金・金融サービスではありません。送金、ウォレット接続、税制優遇、熊本県による承認はすべて未実装です。</small>
      </footer>

      {supportOpen && (
        <div className="modal-backdrop" onClick={() => setSupportOpen(false)}>
          <form className="dialog support-dialog" onSubmit={simulateSupport} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="close" onClick={() => setSupportOpen(false)}>×</button>
            <p className="eyebrow dark">SUPPORT FLOW DEMO</p><h2>復興支援を体験する</h2>
            <div className="safe-notice"><b>デモモード</b> 実際のウォレット接続・送金は行いません。</div>
            <label>支援方法<div className="segment"><button type="button" className={asset === "JPYC" ? "active" : ""} onClick={() => { setAsset("JPYC"); setAmount("30000"); }}>JPYC</button><button type="button" className={asset === "ETH" ? "active" : ""} onClick={() => { setAsset("ETH"); setAmount("0.05"); }}>ETH</button></div></label>
            <label>支援額<div className="amount-input"><input required type="number" min="0.001" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} /><span>{asset}</span></div></label>
            <div className="two-fields">
              <label>公開する国・地域<select value={country} onChange={(e) => setCountry(e.target.value)}>{["日本", "アメリカ", "シンガポール", "フランス", "台湾", "その他"].map(x => <option key={x}>{x}</option>)}</select></label>
              <label>玉垣の表示名<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></label>
            </div>
            <label>熊本へのメッセージ<textarea value={message} onChange={(e) => setMessage(e.target.value)} /></label>
            <label className="check"><input required type="checkbox" /> <span>これは説明用デモであり、実際の支援や税制優遇ではないことを確認しました</span></label>
            <button className="submit" type="submit">疑似支援を実行して玉垣を発行 <span>→</span></button>
          </form>
        </div>
      )}

      {receipt && (
        <div className="modal-backdrop" onClick={() => setReceipt(null)}>
          <article className="dialog receipt-dialog" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setReceipt(null)}>×</button>
            <div className="large-plaque"><small>{receipt.flag}</small><i>結</i><b>{receipt.name}</b><em>#{receipt.id}</em></div>
            <div className="receipt-copy">
              <p className="eyebrow dark">DIGITAL TAMAGAKI DEMO</p><h2>支援の証を発行しました</h2>
              <span className={`status ${receipt.status}`}>{statusLabel[receipt.status]}</span>
              <blockquote>「{receipt.message}」</blockquote>
              <dl>
                <div><dt>国・地域</dt><dd>{receipt.country}</dd></div>
                <div><dt>支援</dt><dd>{receipt.asset === "JPYC" ? `${yen(receipt.amount)} JPYC` : `${receipt.amount} ETH`}</dd></div>
                <div><dt>円換算参考額</dt><dd>¥{yen(receipt.yen)}</dd></div>
                <div><dt>SBT規格案</dt><dd>ERC-721 + ERC-5192</dd></div>
                <div><dt>デモ取引ID</dt><dd className="mono">0xdemo…{receipt.id}</dd></div>
              </dl>
              <p className="fine">実際のSBTやブロックチェーントランザクションは発行されていません。</p>
            </div>
          </article>
        </div>
      )}

      {adminOpen && (
        <div className="modal-backdrop" onClick={() => setAdminOpen(false)}>
          <form className="dialog admin-dialog" onSubmit={publishUpdate} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="close" onClick={() => setAdminOpen(false)}>×</button>
            <p className="eyebrow dark">KUMAMOTO ADMIN DEMO</p><h2>復興報告を更新する</h2>
            <div className="safe-notice"><b>県担当者画面の構想デモ</b> 熊本県の実システムではありません。</div>
            <label>対象事業<select value={selectedProject} onChange={(e) => { setSelectedProject(e.target.value); const p = projects.find(x => x.id === e.target.value); if (p) { setProgress(String(p.progress)); setProjectUpdate(p.update); } }}>{projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
            <label>進捗率<div className="range-row"><input type="range" min="0" max="100" value={progress} onChange={(e) => setProgress(e.target.value)} /><b>{progress}%</b></div></label>
            <label>支援者への進捗報告<textarea value={projectUpdate} onChange={(e) => setProjectUpdate(e.target.value)} /></label>
            <div className="upload-demo"><span>＋</span><b>写真・報告書を追加</b><small>デモではファイルは保存されません</small></div>
            <button className="submit" type="submit">デモ報告を公開 <span>→</span></button>
          </form>
        </div>
      )}
    </main>
  );
}
