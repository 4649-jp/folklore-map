"use client";

import { AdminLayout } from "@/components/admin-layout";
import { useEffect, useState } from "react";

interface Spot {
  id: string;
  title: string;
  description: string;
  address: string | null;
  icon_type: string;
  status: string;
  updated_at: string;
  created_by: string;
}

export default function AdminSpotsPage() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [iconFilter, setIconFilter] = useState<string>("all");
  const [selectedSpots, setSelectedSpots] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    spotId: string | null;
    spotTitle: string;
  }>({ open: false, spotId: null, spotTitle: "" });
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);

  useEffect(() => {
    loadSpots();
  }, []);

  const loadSpots = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/spots?status=all&limit=1000");
      const response = await res.json();
      // jsonResponse がデータを { data: ... } でラップしている
      setSpots(response.data?.spots || response.data?.items || []);
    } catch (error) {
      console.error("スポット取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (spotId: string) => {
    try {
      const res = await fetch(`/api/spots/${spotId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSpots(spots.filter((s) => s.id !== spotId));
        setDeleteConfirm({ open: false, spotId: null, spotTitle: "" });
        alert("削除しました");
        // リロード
        await loadSpots();
      } else {
        const response = await res.json();
        alert(`削除に失敗しました: ${response.error?.message || "不明なエラー"}`);
      }
    } catch (error) {
      console.error("削除エラー:", error);
      alert("削除に失敗しました");
    }
  };

  const handlePublish = async (spotId: string) => {
    try {
      const res = await fetch(`/api/spots/${spotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PUBLISHED" }),
      });

      if (res.ok) {
        // スポット一覧を再読み込み
        await loadSpots();
        alert("公開しました");
      } else {
        const response = await res.json();
        alert(`公開に失敗しました: ${response.error?.message || "不明なエラー"}`);
      }
    } catch (error) {
      console.error("公開エラー:", error);
      alert("公開に失敗しました");
    }
  };

  const handleBatchDelete = async () => {
    const confirmed = confirm(
      `選択した ${selectedSpots.size} 件のスポットを削除しますか？\nこの操作は取り消せません。`
    );
    if (!confirmed) return;

    try {
      const deletePromises = Array.from(selectedSpots).map((spotId) =>
        fetch(`/api/spots/${spotId}`, { method: "DELETE" })
      );

      await Promise.all(deletePromises);

      setSpots(spots.filter((s) => !selectedSpots.has(s.id)));
      setSelectedSpots(new Set());
      setBatchDeleteConfirm(false);
      alert(`${deletePromises.length} 件のスポットを削除しました`);
    } catch (error) {
      console.error("一括削除エラー:", error);
      alert("一括削除に失敗しました");
    }
  };

  const toggleSelectAll = () => {
    if (selectedSpots.size === filteredSpots.length) {
      setSelectedSpots(new Set());
    } else {
      setSelectedSpots(new Set(filteredSpots.map((s) => s.id)));
    }
  };

  const toggleSelect = (spotId: string) => {
    const newSelected = new Set(selectedSpots);
    if (newSelected.has(spotId)) {
      newSelected.delete(spotId);
    } else {
      newSelected.add(spotId);
    }
    setSelectedSpots(newSelected);
  };

  const filteredSpots = spots.filter((spot) => {
    const matchesSearch =
      searchQuery === "" ||
      spot.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spot.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || spot.status === statusFilter;

    const matchesIcon = iconFilter === "all" || spot.icon_type === iconFilter;

    return matchesSearch && matchesStatus && matchesIcon;
  });

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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">スポット管理</h2>
            <p className="text-gray-600 mt-1">
              全 {spots.length} 件（表示中: {filteredSpots.length} 件）
            </p>
          </div>
          {selectedSpots.size > 0 && (
            <button
              onClick={handleBatchDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              選択した {selectedSpots.size} 件を削除
            </button>
          )}
        </div>

        {/* フィルター */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                検索
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="タイトルや説明で検索..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ステータス
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">すべて</option>
                <option value="DRAFT">下書き</option>
                <option value="REVIEW">レビュー中</option>
                <option value="PUBLISHED">公開</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                アイコン種別
              </label>
              <select
                value={iconFilter}
                onChange={(e) => setIconFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">すべて</option>
                <option value="ONI">鬼</option>
                <option value="KITSUNE">狐</option>
                <option value="DOG">犬</option>
                <option value="DRAGON">龍</option>
                <option value="TEMPLE">寺</option>
                <option value="SHRINE">神社</option>
                <option value="ANIMAL">動物</option>
                <option value="GENERIC">その他</option>
              </select>
            </div>
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
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={
                          filteredSpots.length > 0 &&
                          selectedSpots.size === filteredSpots.length
                        }
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      タイトル
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      アイコン
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      住所
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      作成日
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSpots.map((spot) => (
                    <tr key={spot.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedSpots.has(spot.id)}
                          onChange={() => toggleSelect(spot.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {spot.title}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {spot.description.substring(0, 100)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">
                          {iconLabels[spot.icon_type] || spot.icon_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            spot.status === "PUBLISHED"
                              ? "bg-green-100 text-green-800"
                              : spot.status === "REVIEW"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {statusLabels[spot.status] || spot.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700 truncate max-w-xs">
                          {spot.address || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(spot.updated_at).toLocaleDateString("ja-JP")}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex gap-3 justify-end">
                          {spot.status !== "PUBLISHED" && (
                            <button
                              onClick={() => handlePublish(spot.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              公開
                            </button>
                          )}
                          <button
                            onClick={() =>
                              setDeleteConfirm({
                                open: true,
                                spotId: spot.id,
                                spotTitle: spot.title,
                              })
                            }
                            className="text-red-600 hover:text-red-900"
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredSpots.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">該当するスポットがありません</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 削除確認ダイアログ */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              スポットを削除
            </h3>
            <p className="text-gray-700 mb-6">
              「{deleteConfirm.spotTitle}」を削除しますか？
              <br />
              <span className="text-red-600 font-medium">
                この操作は取り消せません。
              </span>
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() =>
                  setDeleteConfirm({ open: false, spotId: null, spotTitle: "" })
                }
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.spotId) {
                    handleDelete(deleteConfirm.spotId);
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
