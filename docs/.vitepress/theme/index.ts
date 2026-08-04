import { defineComponent, h, watchEffect } from "vue";
import DefaultTheme from "vitepress/theme";
import { useData } from "vitepress";
import type { Theme } from "vitepress";
import TestnetDemo from "./components/TestnetDemo.vue";
import DemoStatus from "./components/DemoStatus.vue";
import MainnetSupportTrend from "./components/MainnetSupportTrend.vue";
import "./style.css";

const Layout = defineComponent({
  setup() {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- VitePress composable inside Vue setup
    const { page, site, theme } = useData();
    watchEffect(() => {
      const isEnglish = page.value.relativePath.startsWith("en/");
      const pageSlug = page.value.relativePath
        .replace(/^en\//, "")
        .replace(/(^|\/)index\.md$/, "")
        .replace(/\.md$/, "");
      const translatedPages = [
        "", "vision", "architecture", "fund-flow", "tamagaki-sbt", "transparency",
        "governance", "environments", "roadmap", "risks", "wallet-experience", "prefecture-operations", "smart-contracts", "demo-status", "mainnet-status",
      ];
      const languageLink = isEnglish
        ? `/${pageSlug}`
        : translatedPages.includes(pageSlug) ? `/en/${pageSlug}` : "/en/";
      site.value.title = isEnglish ? "Kumamoto Relief DAO Whitepaper" : "熊本災害支援DAO Whitepaper";
      site.value.description = isEnglish
        ? "From the world to Kumamoto: a verifiable recovery support platform."
        : "世界から熊本へ。検証可能な復興支援基盤のホワイトペーパー。";
      Object.assign(theme.value, {
      logo: "/favicon.svg",
      siteTitle: isEnglish ? "Kumamoto Relief DAO" : "熊本災害支援DAO",
      nav: isEnglish ? [
        { text: "Whitepaper", link: "/en/vision" },
        { text: "Architecture", link: "/en/architecture" },
        { text: "Contracts", link: "/en/smart-contracts" },
        { text: "Operations", link: "/en/prefecture-operations" },
        { text: "Testnet Guide", link: "/en/wallet-experience" },
        { text: "Mainnet Status", link: "/en/mainnet-status" },
        { text: "Testnet Data", link: "/en/demo-status" },
        { text: "GitHub", link: "https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto" },
        { text: "日本語", link: languageLink },
      ] : [
        { text: "ホワイトペーパー", link: "/vision" },
        { text: "技術設計", link: "/architecture" },
        { text: "コントラクト", link: "/smart-contracts" },
        { text: "NPO・県運用", link: "/prefecture-operations" },
        { text: "デモガイド", link: "/wallet-experience" },
        { text: "本番支援状況", link: "/mainnet-status" },
        { text: "テストネット集計", link: "/demo-status" },
        { text: "ADR", link: "/adr/" },
        { text: "GitHub", link: "https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto" },
        { text: "English", link: languageLink },
      ],
      sidebar: isEnglish ? [
        {
          text: "Whitepaper",
          items: [
            { text: "Overview", link: "/en/" },
            { text: "1. Vision and Principles", link: "/en/vision" },
            { text: "2. Architecture", link: "/en/architecture" },
            { text: "3. Support and Fund Flow", link: "/en/fund-flow" },
            { text: "4. Tamagaki SBT", link: "/en/tamagaki-sbt" },
            { text: "5. Transparency and Data", link: "/en/transparency" },
            { text: "6. Governance", link: "/en/governance" },
            { text: "7. Production and Demo", link: "/en/environments" },
            { text: "8. Roadmap", link: "/en/roadmap" },
            { text: "9. Risks and Disclaimer", link: "/en/risks" },
            { text: "Wallet User Experience", link: "/en/wallet-experience" },
            { text: "NPO and Prefectural Operations", link: "/en/prefecture-operations" },
            { text: "Live Demo Data", link: "/en/demo-status" },
            { text: "Mainnet Status", link: "/en/mainnet-status" },
          ],
        },
        { text: "Implementation", items: [{ text: "Smart Contracts", link: "/en/smart-contracts" }] },
        { text: "Language", items: [{ text: "日本語版", link: "/" }] },
      ] : [
        {
          text: "Whitepaper",
          items: [
            { text: "概要", link: "/" },
            { text: "1. ビジョンと原則", link: "/vision" },
            { text: "2. システム構造", link: "/architecture" },
            { text: "3. 支援と資金フロー", link: "/fund-flow" },
            { text: "4. 玉垣SBT", link: "/tamagaki-sbt" },
            { text: "5. 透明性とデータ", link: "/transparency" },
            { text: "6. ガバナンス", link: "/governance" },
            { text: "7. 本番系とデモ系", link: "/environments" },
            { text: "8. ロードマップ", link: "/roadmap" },
            { text: "9. リスクと免責", link: "/risks" },
            { text: "ウォレット利用体験", link: "/wallet-experience" },
            { text: "認定NPO・熊本県向け運用", link: "/prefecture-operations" },
            { text: "デモ集計", link: "/demo-status" },
            { text: "本番支援状況", link: "/mainnet-status" },
          ],
        },
        {
          text: "実装",
          items: [{ text: "スマートコントラクト", link: "/smart-contracts" }],
        },
        { text: "設計記録", items: [{ text: "ADR一覧", link: "/adr/" }] },
      ],
      socialLinks: [
        { icon: "github", link: "https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto" },
      ],
      footer: {
        message: isEnglish
          ? "This whitepaper describes a concept and technical prototype."
          : "本サイトは構想・技術検証段階のホワイトペーパーです。",
        copyright: isEnglish ? "Kumamoto Relief DAO Project" : "熊本災害支援DAOプロジェクト",
      },
      outline: { level: [2, 3], label: isEnglish ? "On this page" : "このページ" },
      docFooter: { prev: isEnglish ? "Previous" : "前へ", next: isEnglish ? "Next" : "次へ" },
    });
    });
    return () => h(DefaultTheme.Layout);
  },
});

const KumamotoReliefDaoTheme: Theme = {
  ...DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component("TestnetDemo", TestnetDemo);
    app.component("DemoStatus", DemoStatus);
    app.component("MainnetSupportTrend", MainnetSupportTrend);
  },
};

export default KumamotoReliefDaoTheme;
