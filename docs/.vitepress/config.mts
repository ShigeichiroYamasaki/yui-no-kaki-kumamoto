import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

export default withMermaid(
  defineConfig({
    markdown: {
      math: true,
    },
    mermaid: {
      securityLevel: "strict",
      flowchart: {
        useMaxWidth: true,
      },
    },
  }),
);
