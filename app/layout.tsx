import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "熊本災害支援DAO｜復興支援プロトタイプ",
  description:
    "世界から熊本へ届く復興支援と、インフラ復旧の進捗をつなぐインタラクティブ・プロトタイプ。",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
  },
  openGraph: {
    title: "熊本災害支援DAO｜復興支援プロトタイプ",
    description: "世界の想いを、熊本の力へ。",
    locale: "ja_JP",
    type: "website",
    images: [{ url: "/og.png", width: 1732, height: 909, alt: "熊本城を囲むデジタル玉垣" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "熊本災害支援DAO｜復興支援プロトタイプ",
    description: "世界の想いを、熊本の力へ。",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
