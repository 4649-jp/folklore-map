import type { Metadata } from "next";
import { Noto_Serif_JP, Zen_Kaku_Gothic_New } from "next/font/google";
import { Header } from "@/components/header";
import "./globals.css";

// 和風明朝体フォント
const notoSerifJP = Noto_Serif_JP({
  variable: "--font-serif-jp",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// 和風ゴシック体フォント
const zenKaku = Zen_Kaku_Gothic_New({
  variable: "--font-gothic-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "民俗学マップ（仮）",
  description:
    "伝承・民話・神社仏閣の由来を地図で学べる Next.js ベースの学習用アプリケーション。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${notoSerifJP.variable} ${zenKaku.variable} min-h-screen bg-washi text-sumi antialiased font-serif-jp`}
      >
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1 bg-washi">{children}</main>
          <footer className="border-t-2 border-ai/20 bg-gradient-to-t from-washi-dark to-washi py-6 text-center text-sm text-sumi/60 font-gothic-jp">
            <p>© {new Date().getFullYear()} 民俗学マッププロジェクト</p>
            <p className="text-xs mt-2 text-sumi/40">日本の伝承と民話を未来へ</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
