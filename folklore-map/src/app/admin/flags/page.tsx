"use client";

import { AdminLayout } from "@/components/admin-layout";
import { useEffect, useState } from "react";

interface Flag {
  id: string;
  reason: string;
  status: string;
  memo: string | null;
  created_at: string;
  spot: {
    id: string;
    title: string;
  };
}

export default function AdminFlagsPage() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("OPEN");
  const [detailModal, setDetailModal] = useState<{
    open: boolean;
    flag: Flag | null;
  }>({ open: false, flag: null });
  const [comment, setComment] = useState("");

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/flags");
      const response = await res.json();
      // jsonResponse がデータを { data: ... } でラップしている
      setFlags(response.data?.flags || []);
    } catch (error) {
      console.error("通報取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (flagId: string) => {
    try {
      const res = await fetch(`/api/flags/${flagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CLOSED",
          note: comment || undefined,
        }),
      });

      if (res.ok) {
        await loadFlags();
        setDetailModal({ open: false, flag: null });
        setComment("");
        alert("通報を処理済みにしました");
      } else {
        const response = await res.json();
        alert(`エラー: ${response.error?.message || "不明なエラー"}`);
      }
    } catch (error) {
      console.error("通報処理エラー:", error);
      alert("処理に失敗しました");
    }
  };

  const filteredFlags = flags.filter((flag) =>
    statusFilter === "all" ? true : flag.status === statusFilter
  );

  const reasonLabels: Record<string, string> = {
    INAPPROPRIATE: "不適切なコンテンツ",
    WRONG_INFO: "誤った情報",
    DISCRIMINATION: "差別的表現",
    PRIVACY: "プライバシー侵害",
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">通報管理</h2>
          <p className="text-gray-600 mt-1">
            全 {flags.length} 件（表示中: {filteredFlags.length} 件）
          </p>
        </div>

        {/* フィルター */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex gap-4">
            <button
              onClick={() => setStatusFilter("OPEN")}
              className={`px-4 py-2 rounded-md transition-colors ${
                statusFilter === "OPEN"
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              未処理 ({flags.filter((f) => f.status === "OPEN").length})
            </button>
            <button
              onClick={() => setStatusFilter("CLOSED")}
              className={`px-4 py-2 rounded-md transition-colors ${
                statusFilter === "CLOSED"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              処理済み ({flags.filter((f) => f.status === "CLOSED").length})
            </button>
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-4 py-2 rounded-md transition-colors ${
                statusFilter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              すべて
            </button>
          </div>
        </div>

        {/* テーブル */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-600">読み込み中...</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      スポット
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      理由
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      メモ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      通報日
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFlags.map((flag) => (
                    <tr key={flag.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {flag.spot.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">
                          {reasonLabels[flag.reason] || flag.reason}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {flag.memo || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            flag.status === "OPEN"
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {flag.status === "OPEN" ? "未処理" : "処理済み"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(flag.created_at).toLocaleDateString("ja-JP")}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() =>
                            setDetailModal({ open: true, flag: flag })
                          }
                          className="text-blue-600 hover:text-blue-900"
                        >
                          詳細
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredFlags.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">該当する通報がありません</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 詳細モーダル */}
      {detailModal.open && detailModal.flag && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              通報詳細
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  スポット
                </label>
                <p className="text-gray-900">{detailModal.flag.spot.title}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  通報理由
                </label>
                <p className="text-gray-900">
                  {reasonLabels[detailModal.flag.reason] ||
                    detailModal.flag.reason}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  詳細メモ
                </label>
                <p className="text-gray-900 whitespace-pre-wrap">
                  {detailModal.flag.memo || "（メモなし）"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  通報日時
                </label>
                <p className="text-gray-900">
                  {new Date(detailModal.flag.created_at).toLocaleString("ja-JP")}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ステータス
                </label>
                <span
                  className={`inline-block px-2 py-1 text-xs rounded-full ${
                    detailModal.flag.status === "OPEN"
                      ? "bg-red-100 text-red-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {detailModal.flag.status === "OPEN" ? "未処理" : "処理済み"}
                </span>
              </div>

              {detailModal.flag.status === "OPEN" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    処理コメント（任意）
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="処理内容や対応結果を記録..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setDetailModal({ open: false, flag: null });
                  setComment("");
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                閉じる
              </button>
              {detailModal.flag.status === "OPEN" && (
                <button
                  onClick={() => handleClose(detailModal.flag!.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  処理済みにする
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
