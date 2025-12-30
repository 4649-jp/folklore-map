"use client";

import { useState } from "react";

export default function TestAuthPage() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const testSupabaseConnection = async () => {
    setLoading(true);
    setResult("テスト開始...\n");

    try {
      // 1. 環境変数を確認
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      setResult(prev => prev + `\n✅ 環境変数読み込み成功\nURL: ${url}\nKey: ${key?.substring(0, 20)}...\n`);

      if (!url || !key) {
        throw new Error("環境変数が設定されていません");
      }

      // 2. Health check
      setResult(prev => prev + "\n🔍 Supabase Health Checkを実行中...\n");
      const healthResponse = await fetch(`${url}/auth/v1/health`);
      const healthData = await healthResponse.json();
      setResult(prev => prev + `✅ Health Check成功: ${JSON.stringify(healthData)}\n`);

      // 3. 直接signupをテスト
      setResult(prev => prev + "\n🚀 Signup APIを直接テスト中...\n");
      const signupResponse = await fetch(`${url}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'apikey': key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: `test${Date.now()}@example.com`,
          password: 'test123456'
        })
      });

      const signupData = await signupResponse.json();
      setResult(prev => prev + `\n📦 Signup Response Status: ${signupResponse.status}\n`);
      setResult(prev => prev + `📦 Signup Response Data: ${JSON.stringify(signupData, null, 2)}\n`);

      if (signupResponse.ok) {
        setResult(prev => prev + "\n✅✅✅ すべてのテストが成功しました！\n");
      } else {
        setResult(prev => prev + "\n⚠️ Signupは失敗しましたが、接続は成功しています\n");
      }

    } catch (error) {
      setResult(prev => prev + `\n❌ エラー発生: ${error}\n`);
      if (error instanceof Error) {
        setResult(prev => prev + `❌ エラーメッセージ: ${error.message}\n`);
        setResult(prev => prev + `❌ エラースタック: ${error.stack}\n`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-4">Supabase認証テスト</h1>

      <button
        onClick={testSupabaseConnection}
        disabled={loading}
        className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed mb-4"
      >
        {loading ? "テスト実行中..." : "Supabase接続をテスト"}
      </button>

      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="font-bold mb-2">テスト結果:</h2>
        <pre className="whitespace-pre-wrap font-mono text-sm">
          {result || "ボタンをクリックしてテストを開始してください"}
        </pre>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-bold mb-2">💡 このテストページについて</h3>
        <p className="text-sm">
          このページは、Supabase認証が正常に動作するかを直接テストします。
          環境変数、ネットワーク接続、APIレスポンスをすべて確認できます。
        </p>
      </div>
    </div>
  );
}
