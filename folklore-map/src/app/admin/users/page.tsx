"use client";

import { AdminLayout } from "@/components/admin-layout";

export default function AdminUsersPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">ユーザー管理</h2>
          <p className="text-gray-600 mt-1">
            ユーザーの権限管理機能（実装予定）
          </p>
        </div>

        {/* プレースホルダー */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              ユーザー管理機能
            </h3>
            <p className="text-gray-600 mb-6">
              この機能は今後実装予定です。
              <br />
              Supabase Authと連携したユーザー管理機能を提供します。
            </p>
            <div className="text-left max-w-md mx-auto bg-gray-50 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-3">実装予定機能:</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>ユーザー一覧の表示</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>ロール（権限）の変更</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>ユーザーの有効化/無効化</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>ユーザーアクティビティログの閲覧</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>アカウント作成日時と最終ログイン</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
