"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      // サーバーサイドAPIを使用（ブラウザから直接Supabaseに接続しない）
      const endpoint = isSignUp ? "/api/auth/signup" : "/api/auth/signin";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "認証に失敗しました");
      }

      if (isSignUp) {
        if (data.user?.identities?.length === 0) {
          setError("このメールアドレスは既に登録されています。");
        } else {
          setMessage("アカウントが作成されました！");
          if (data.session) {
            router.push("/post");
            router.refresh();
          }
        }
      } else {
        router.push("/post");
        router.refresh();
      }
    } catch (err) {
      console.error("認証エラー:", err);
      let errorMessage = "認証に失敗しました。もう一度お試しください。";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-6 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-sumi">
          {isSignUp ? "新規登録" : "ログイン"}
        </h1>
        <p className="mt-2 text-sm text-sumi/60 font-gothic-jp">
          {isSignUp
            ? "アカウントを作成して投稿を始めましょう"
            : "アカウントにログインしてください"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-sumi mb-2 font-gothic-jp"
          >
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent transition focus:border-primary focus:ring-primary/30"
            placeholder="example@email.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-sumi mb-2 font-gothic-jp"
          >
            パスワード
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent transition focus:border-primary focus:ring-primary/30"
            placeholder="6文字以上"
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-shu px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-shu/90 disabled:opacity-50 disabled:cursor-not-allowed font-gothic-jp"
        >
          {loading
            ? "処理中..."
            : isSignUp
              ? "アカウント作成"
              : "ログイン"}
        </button>
      </form>

      <div className="text-center">
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError("");
            setMessage("");
          }}
          className="text-sm text-ai hover:underline font-gothic-jp"
        >
          {isSignUp
            ? "既にアカウントをお持ちの方はこちら"
            : "アカウントをお持ちでない方はこちら"}
        </button>
      </div>

      <div className="rounded-lg border-2 border-ai/20 bg-washi-dark px-5 py-4 text-sm text-sumi/70 font-gothic-jp">
        <p className="font-semibold text-ai mb-2">💡 開発環境でのテスト</p>
        <p className="text-xs">
          開発環境では、メール確認なしでログインできます。任意のメールアドレスとパスワードでサインアップしてください。
        </p>
      </div>
    </div>
  );
}
