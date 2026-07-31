import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Kumamoto recovery support prototype", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="ja">/i);
  assert.match(html, /<title>熊本災害支援DAO｜復興支援プロトタイプ<\/title>/i);
  assert.match(html, /INTERACTIVE PROTOTYPE/);
  assert.match(html, /世界の想いを、/);
  assert.match(html, /熊本県へ送金済み/);
  assert.match(html, /資金の流れ/);
  assert.match(html, /復興の進捗/);
  assert.match(html, /このサイトの資金・人物・事業はすべて説明用のサンプルです/);
});

test("keeps the demo disclosure and privacy policy visible in source", async () => {
  const [page, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /熊本災害支援DAO｜復興支援プロトタイプ/);
  assert.match(page, /INTERACTIVE PROTOTYPE/);
  assert.match(page, /説明用のサンプル/);
  assert.match(page, /ウォレットから国を推測することはありません/);
  assert.match(page, /送金、ウォレット接続、税制優遇、熊本県による承認はすべて未実装です/);
  assert.match(page, /支援者が任意で公開した国・地域/);
});
