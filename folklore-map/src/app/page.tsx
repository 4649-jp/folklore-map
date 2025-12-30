import { prisma } from "@/lib/db";
import { SpotExplorer } from "@/components/spot-explorer";
import type { SpotListItem } from "@/components/spot-types";

export const revalidate = 60; // 1分ごとに再検証（暫定）

export default async function Home() {
  const spots = await prisma.spot.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      lat: true,
      lng: true,
      icon_type: true,
      status: true,
      updated_at: true,
    },
    orderBy: { updated_at: "desc" },
    // なるべく全件取得（必要ならAPI側でlimit=2000に合わせて調整）
    take: 2000,
  });

  const publishedSpots: SpotListItem[] = spots.map((spot) => ({
    ...spot,
    updated_at: spot.updated_at.toISOString(),
  }));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-12">
      <section className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="space-y-4 md:max-w-3xl">
          <span className="inline-flex items-center rounded-full bg-shu/10 border border-shu/30 px-4 py-1.5 text-sm font-medium text-shu font-gothic-jp">
            📜 Sechack365 プロジェクト
          </span>
          <h1 className="text-3xl font-bold md:text-4xl text-sumi leading-relaxed">
            日本の伝承と民話を地図で辿る
          </h1>
          <p className="text-base leading-loose text-sumi/70 font-gothic-jp">
            伝承・民話・神社仏閣の由来を地図上で可視化し、明治期の古地図と重ね合わせて学べる学習用アプリです。土地の変遷や歴史の厚みを体感できます。
          </p>
        </div>
        <div className="rounded-lg border-2 border-ai/30 bg-gradient-to-br from-washi to-washi-dark px-5 py-4 text-sm text-sumi/80 md:w-64 shadow-md font-gothic-jp">
          <p className="font-semibold text-ai text-base mb-3 flex items-center gap-2">
            <span>📖</span>
            <span>実装済み機能</span>
          </p>
          <ul className="mt-2 space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-shu mt-0.5">✓</span>
              <span>Google Maps 地図表示</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-shu mt-0.5">✓</span>
              <span>全国180件超の民俗学伝承データ</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-shu mt-0.5">✓</span>
              <span>詳細情報と出典表示</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-shu mt-0.5">✓</span>
              <span>明治期古地図との比較機能</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between border-b-2 border-shu/20 pb-3">
          <h2 className="text-2xl font-bold text-sumi flex items-center gap-2">
            <span>🗺️</span>
            <span>公開スポット一覧</span>
          </h2>
          <p className="text-sm text-sumi/60 font-gothic-jp">
            {publishedSpots.length > 0
              ? `${publishedSpots.length}件の伝承を表示中`
              : "スポットを読み込んでいます..."}
          </p>
        </div>
        <SpotExplorer spots={publishedSpots} />
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {[
          {
            title: "🔄 三段階承認フロー",
            description:
              "下書き → レビュー → 公開の3段階で品質を担保しています。",
          },
          {
            title: "🛡️ プライバシー保護",
            description:
              "座標を100〜300mぼかし処理。差別的表現や個人情報を自動検出し、安全な情報共有を実現します。",
          },
          {
            title: "📚 古地図との比較",
            description:
              "明治時代の古地図と現代地図を切り替え表示。土地の変遷を視覚的に理解できます。",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-lg border-2 border-ai/20 bg-gradient-to-br from-white/80 to-washi p-6 shadow-md transition hover:-translate-y-1 hover:shadow-xl hover:border-shu/40 font-gothic-jp"
          >
            <h3 className="text-base font-bold text-sumi mb-3">{item.title}</h3>
            <p className="text-sm text-sumi/70 leading-relaxed">
              {item.description}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
