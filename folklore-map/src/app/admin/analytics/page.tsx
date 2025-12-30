"use client";

import { AdminLayout } from "@/components/admin-layout";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface SpotHistoryItem {
  id: string;
  title: string;
  created_by: string;
  created_at: string;
  status: string;
  icon_type: string;
}

interface SearchLogItem {
  id: string;
  keyword: string | null;
  icon_types: string | null;
  era: string | null;
  status: string | null;
  results_count: number;
  user_id: string | null;
  searched_at: string;
}

interface PopularityItem {
  spot_id: string;
  spot_title: string;
  spot_icon_type: string;
  spot_status: string;
  view_count: number;
  avg_duration_ms: number;
  like_count: number;
  save_count: number;
  share_count: number;
  total_interactions: number;
}

interface KeywordStat {
  keyword: string;
  count: number;
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "spot-history" | "search-logs" | "popularity"
  >("spot-history");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // スポット履歴データ
  const [spotHistory, setSpotHistory] = useState<{
    spots: SpotHistoryItem[];
    total: number;
  }>({ spots: [], total: 0 });

  // 検索ログデータ
  const [searchLogs, setSearchLogs] = useState<{
    logs: SearchLogItem[];
    total: number;
    aggregations: {
      keywords: KeywordStat[];
      iconTypes: any[];
      eras: any[];
    };
  }>({
    logs: [],
    total: 0,
    aggregations: { keywords: [], iconTypes: [], eras: [] },
  });

  // 人気指標データ
  const [popularity, setPopularity] = useState<{
    popularity: PopularityItem[];
    summary: {
      total_views: number;
      total_likes: number;
      total_saves: number;
      total_shares: number;
    };
  }>({
    popularity: [],
    summary: { total_views: 0, total_likes: 0, total_saves: 0, total_shares: 0 },
  });

  // データ読み込み
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);

      if (activeTab === "spot-history") {
        const res = await fetch(
          `/api/admin/analytics/spot-history?${params.toString()}`
        );
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error?.message || "データの取得に失敗しました");
        }
        const data = await res.json();
        if (data.data) {
          setSpotHistory(data.data);
        }
      } else if (activeTab === "search-logs") {
        const res = await fetch(
          `/api/admin/analytics/search-logs?${params.toString()}`
        );
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error?.message || "データの取得に失敗しました");
        }
        const data = await res.json();
        if (data.data) {
          setSearchLogs(data.data);
        }
      } else if (activeTab === "popularity") {
        const res = await fetch(
          `/api/admin/analytics/popularity?${params.toString()}`
        );
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error?.message || "データの取得に失敗しました");
        }
        const data = await res.json();
        if (data.data) {
          setPopularity(data.data);
        }
      }
    } catch (err) {
      console.error("データ読み込みエラー:", err);
      setError(err instanceof Error ? err.message : "データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // 認証チェック（開発中は無効化）
  useEffect(() => {
    // 開発中のため認証チェックをスキップ
    setAuthChecking(false);

    /* 本番環境では以下のコメントを解除してください
    const checkAuth = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setError("ログインが必要です。ログインページにリダイレクトします...");
          setTimeout(() => {
            router.push("/login?redirect=/admin/analytics");
          }, 2000);
        }
      } catch (err) {
        console.error("認証チェックエラー:", err);
        setError("認証チェックに失敗しました");
      } finally {
        setAuthChecking(false);
      }
    };

    void checkAuth();
    */
  }, [router]);

  useEffect(() => {
    if (!authChecking) {
      void loadData();
    }
  }, [activeTab, startDate, endDate, authChecking]);

  // CSV エクスポート
  const handleExport = () => {
    const params = new URLSearchParams();
    params.set("type", activeTab);
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);

    const url = `/api/admin/analytics/export?${params.toString()}`;
    window.open(url, "_blank");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">分析ダッシュボード</h2>
            <p className="text-gray-600 mt-1">
              スポット履歴、検索ログ、人気指標の分析
            </p>
          </div>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            📥 CSV エクスポート
          </button>
        </div>

        {/* 期間フィルター */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                開始日
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                終了日
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                クリア
              </button>
            </div>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="border-b border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("spot-history")}
              className={`pb-3 px-2 border-b-2 font-medium transition-colors ${
                activeTab === "spot-history"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              📍 スポット追加履歴
            </button>
            <button
              onClick={() => setActiveTab("search-logs")}
              className={`pb-3 px-2 border-b-2 font-medium transition-colors ${
                activeTab === "search-logs"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              🔍 検索ログ集計
            </button>
            <button
              onClick={() => setActiveTab("popularity")}
              className={`pb-3 px-2 border-b-2 font-medium transition-colors ${
                activeTab === "popularity"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              🔥 人気指標
            </button>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-red-600 text-xl">⚠️</span>
              <div>
                <h4 className="text-red-900 font-semibold">エラーが発生しました</h4>
                <p className="text-red-700 text-sm mt-1">{error}</p>
                {error.includes("認証") && (
                  <p className="text-red-600 text-xs mt-2">
                    ログインしていないか、必要な権限がありません。reviewerまたはadmin権限でログインしてください。
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* コンテンツ */}
        {authChecking ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-600">認証を確認中...</div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-600">読み込み中...</div>
          </div>
        ) : !error ? (
          <>
            {/* スポット追加履歴 */}
            {activeTab === "spot-history" && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    スポット追加履歴（総数: {spotHistory.total}件）
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          追加日時
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          タイトル
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          スポットID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          追加者
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ステータス
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          タイプ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {spotHistory.spots.map((spot) => (
                        <tr key={spot.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(spot.created_at).toLocaleString("ja-JP")}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {spot.title}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                            {spot.id.substring(0, 8)}...
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {spot.created_by.substring(0, 8)}...
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                spot.status === "PUBLISHED"
                                  ? "bg-green-100 text-green-800"
                                  : spot.status === "REVIEW"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {spot.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {spot.icon_type}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 検索ログ集計 */}
            {activeTab === "search-logs" && (
              <div className="space-y-6">
                {/* キーワードランキング */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    人気検索キーワード TOP 20
                  </h3>
                  <div className="space-y-3">
                    {searchLogs.aggregations.keywords.map((item, index) => {
                      const maxCount = Math.max(
                        ...searchLogs.aggregations.keywords.map((k) => k.count)
                      );
                      const percentage = (item.count / maxCount) * 100;
                      return (
                        <div key={index}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">
                              {index + 1}. {item.keyword || "(空)"}
                            </span>
                            <span className="text-sm text-gray-600">
                              {item.count}回
                            </span>
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
                </div>

                {/* 検索ログ詳細 */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    検索ログ詳細（総数: {searchLogs.total}件）
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            検索日時
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            キーワード
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            フィルタ
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            結果件数
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {searchLogs.logs.slice(0, 50).map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {new Date(log.searched_at).toLocaleString("ja-JP")}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {log.keyword || "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {[log.icon_types, log.era, log.status]
                                .filter(Boolean)
                                .join(", ") || "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {log.results_count}件
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 人気指標 */}
            {activeTab === "popularity" && (
              <div className="space-y-6">
                {/* サマリーカード */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">総閲覧数</p>
                        <p className="text-3xl font-bold text-blue-600 mt-2">
                          {popularity.summary.total_views}
                        </p>
                      </div>
                      <div className="text-4xl">👁️</div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">総いいね数</p>
                        <p className="text-3xl font-bold text-pink-600 mt-2">
                          {popularity.summary.total_likes}
                        </p>
                      </div>
                      <div className="text-4xl">❤️</div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">総保存数</p>
                        <p className="text-3xl font-bold text-purple-600 mt-2">
                          {popularity.summary.total_saves}
                        </p>
                      </div>
                      <div className="text-4xl">📌</div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">総シェア数</p>
                        <p className="text-3xl font-bold text-green-600 mt-2">
                          {popularity.summary.total_shares}
                        </p>
                      </div>
                      <div className="text-4xl">🔗</div>
                    </div>
                  </div>
                </div>

                {/* 人気ランキング */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    人気スポットランキング
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            順位
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            タイトル
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            閲覧数
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            平均滞在(秒)
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ❤️
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            📌
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            🔗
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {popularity.popularity.map((item, index) => (
                          <tr key={item.spot_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-bold text-gray-900">
                              #{index + 1}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {item.spot_title}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {item.view_count}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {Math.round(item.avg_duration_ms / 1000)}秒
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {item.like_count}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {item.save_count}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {item.share_count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
}
