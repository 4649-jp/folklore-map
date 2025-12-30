"use client";

import { AdminLayout } from "@/components/admin-layout";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Stats {
  spots: {
    total: number;
    byStatus: Record<string, number>;
    byIcon: Record<string, number>;
    statusPercentages: Record<string, number>;
    reviewWaiting: number;
    createdByDate: Record<string, number>;
  };
  flags: {
    total: number;
    open: number;
    closed: number;
    byReason: Record<string, number>;
  };
  recent: {
    spots: Array<{
      id: string;
      title: string;
      status: string;
      updated_at: string;
      created_at: string;
      created_by: string;
    }>;
    flags: Array<{
      id: string;
      reason: string;
      status: string;
      created_at: string;
      spot: {
        id: string;
        title: string;
      };
    }>;
  };
}

// シンプルな円グラフのコンポーネント（CSS + SVG）
function PieChart({
  data,
  labels,
}: {
  data: Record<string, number>;
  labels: Record<string, string>;
}) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) return <p className="text-gray-500 text-sm">データなし</p>;

  const colors = [
    "#10b981", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // purple
  ];

  let cumulativePercentage = 0;
  const slices = Object.entries(data).map(([key, value], index) => {
    const percentage = (value / total) * 100;
    const startPercentage = cumulativePercentage;
    cumulativePercentage += percentage;
    return {
      label: labels[key] || key,
      value,
      percentage,
      startPercentage,
      color: colors[index % colors.length],
    };
  });

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="200" className="mb-4">
        {slices.map((slice, index) => {
          const radius = 80;
          const circumference = 2 * Math.PI * radius;
          const offset = circumference - (slice.percentage / 100) * circumference;
          const startAngle = (slice.startPercentage / 100) * 360;

          return (
            <circle
              key={index}
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth="25"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform={`rotate(${startAngle} 100 100)`}
              style={{
                transition: "all 0.3s ease",
              }}
            />
          );
        })}
      </svg>
      <div className="grid grid-cols-2 gap-2 w-full">
        {slices.map((slice, index) => (
          <div key={index} className="text-xs">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-gray-700">{slice.label}</span>
            </div>
            <div className="text-gray-500">
              {slice.value}件 ({slice.percentage.toFixed(1)}%)
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// シンプルな棒グラフ
function BarChart({
  data,
  labels,
}: {
  data: Record<string, number>;
  labels: Record<string, string>;
}) {
  const sorted = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxValue = Math.max(...sorted.map(([, v]) => v), 1);

  return (
    <div className="space-y-3">
      {sorted.map(([icon, count]) => {
        const percentage = (count / maxValue) * 100;
        return (
          <div key={icon}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">
                {labels[icon] || icon}
              </span>
              <span className="text-sm text-gray-600">{count}件</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then((response) => {
        setStats(response.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("統計取得エラー:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">読み込み中...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!stats) {
    return (
      <AdminLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">統計の取得に失敗しました</p>
        </div>
      </AdminLayout>
    );
  }

  const statusLabels: Record<string, string> = {
    DRAFT: "下書き",
    REVIEW: "レビュー中",
    PUBLISHED: "公開",
  };

  const iconLabels: Record<string, string> = {
    ONI: "鬼",
    KITSUNE: "狐",
    DOG: "犬",
    DRAGON: "龍",
    TEMPLE: "寺",
    SHRINE: "神社",
    ANIMAL: "動物",
    GENERIC: "その他",
  };

  const reasonLabels: Record<string, string> = {
    INAPPROPRIATE: "不適切",
    WRONG_INFO: "誤情報",
    DISCRIMINATION: "差別",
    PRIVACY: "プライバシー",
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* タイトル */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">ダッシュボード</h2>
            <p className="text-gray-600 mt-1">システム全体の統計と最近の活動</p>
          </div>
        </div>

        {/* クイックアクション */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/review">
            <button className="w-full bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg p-4 text-left transition-colors">
              <div className="text-amber-700 font-semibold">レビュー待ち一覧へ</div>
              <div className="text-2xl font-bold text-amber-600 mt-1">
                {stats.spots.reviewWaiting}件
              </div>
            </button>
          </Link>
          <Link href="/flags">
            <button className="w-full bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg p-4 text-left transition-colors">
              <div className="text-red-700 font-semibold">未対応の通報へ</div>
              <div className="text-2xl font-bold text-red-600 mt-1">
                {stats.flags.open}件
              </div>
            </button>
          </Link>
          <Link href="/post">
            <button className="w-full bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg p-4 text-left transition-colors">
              <div className="text-blue-700 font-semibold">新規スポット投稿</div>
              <div className="text-sm text-blue-600 mt-2">
                民俗学スポットを投稿
              </div>
            </button>
          </Link>
        </div>

        {/* 主要統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">総スポット数</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.spots.total}
                </p>
              </div>
              <div className="text-4xl">📍</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">公開中</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {stats.spots.byStatus.PUBLISHED || 0}
                </p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">総通報数</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.flags.total}
                </p>
              </div>
              <div className="text-4xl">🚩</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">未処理通報</p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {stats.flags.open}
                </p>
              </div>
              <div className="text-4xl">⚠️</div>
            </div>
          </div>
        </div>

        {/* グラフセクション */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ステータス別の円グラフ */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              スポット：ステータス別割合
            </h3>
            <PieChart data={stats.spots.byStatus} labels={statusLabels} />
          </div>

          {/* アイコン別の棒グラフ */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              スポット：アイコンタイプ別TOP5
            </h3>
            <BarChart data={stats.spots.byIcon} labels={iconLabels} />
          </div>
        </div>

        {/* 通報理由の分布 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 通報理由 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              通報：理由別の分布
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.flags.byReason)
                .sort((a, b) => b[1] - a[1])
                .map(([reason, count]) => {
                  const percentage =
                    stats.flags.total > 0
                      ? Math.round((count / stats.flags.total) * 100)
                      : 0;
                  return (
                    <div key={reason}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {reasonLabels[reason] || reason}
                        </span>
                        <span className="text-sm text-gray-600">
                          {count}件 ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* 通報ステータス */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              通報：ステータス別
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    未処理
                  </span>
                  <span className="text-sm font-semibold text-red-600">
                    {stats.flags.open}件
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{
                      width: `${
                        stats.flags.total > 0
                          ? (stats.flags.open / stats.flags.total) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    処理済
                  </span>
                  <span className="text-sm font-semibold text-green-600">
                    {stats.flags.closed}件
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${
                        stats.flags.total > 0
                          ? (stats.flags.closed / stats.flags.total) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 最近の活動 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 最近のスポット（10件） */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                最新10件のスポット投稿
              </h3>
              <Link href="/">
                <span className="text-sm text-blue-600 hover:text-blue-800">
                  すべて表示
                </span>
              </Link>
            </div>
            <div className="space-y-2">
              {stats.recent.spots.map((spot) => (
                <div
                  key={spot.id}
                  className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {spot.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      作成：
                      {new Date(spot.created_at).toLocaleString("ja-JP", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span
                    className={`ml-3 px-2 py-1 text-xs rounded-full whitespace-nowrap font-medium ${
                      spot.status === "PUBLISHED"
                        ? "bg-green-100 text-green-800"
                        : spot.status === "REVIEW"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {statusLabels[spot.status] || spot.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 最近の通報（5件） */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                最新5件の通報
              </h3>
              <Link href="/flags">
                <span className="text-sm text-blue-600 hover:text-blue-800">
                  すべて表示
                </span>
              </Link>
            </div>
            <div className="space-y-2">
              {stats.recent.flags.length > 0 ? (
                stats.recent.flags.map((flag) => (
                  <div
                    key={flag.id}
                    className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {flag.spot.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {reasonLabels[flag.reason] || flag.reason} ・{" "}
                        {new Date(flag.created_at).toLocaleString("ja-JP", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span
                      className={`ml-3 px-2 py-1 text-xs rounded-full whitespace-nowrap font-medium ${
                        flag.status === "OPEN"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {flag.status === "OPEN" ? "未処理" : "処理済"}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm py-4">通報はありません</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
