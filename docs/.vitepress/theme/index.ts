import { defineComponent, h } from "vue";
import DefaultTheme from "vitepress/theme";
import { useData } from "vitepress";
import "./style.css";

const Layout = defineComponent({
  setup() {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- VitePress composable inside Vue setup
    const { site, theme } = useData();
    site.value.title = "結の垣 Whitepaper";
    site.value.description = "世界から熊本へ。検証可能な復興支援基盤のホワイトペーパー。";
    Object.assign(theme.value, {
      logo: "/favicon.svg",
      siteTitle: "結の垣",
      nav: [
        { text: "ホワイトペーパー", link: "/vision" },
        { text: "技術設計", link: "/architecture" },
        { text: "ADR", link: "/adr/" },
        { text: "GitHub", link: "https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto" },
      ],
      sidebar: [
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
          ],
        },
        { text: "設計記録", items: [{ text: "ADR一覧", link: "/adr/" }] },
      ],
      socialLinks: [
        { icon: "github", link: "https://github.com/ShigeichiroYamasaki/yui-no-kaki-kumamoto" },
      ],
      footer: {
        message: "本サイトは構想・技術検証段階のホワイトペーパーです。",
        copyright: "結の垣プロジェクト",
      },
      outline: { level: [2, 3], label: "このページ" },
      docFooter: { prev: "前へ", next: "次へ" },
    });
    return () => h(DefaultTheme.Layout);
  },
});

const YuiNoKakiTheme = { ...DefaultTheme, Layout };

export default YuiNoKakiTheme;
