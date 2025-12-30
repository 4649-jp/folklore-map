"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // 初回セッション取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 認証状態の変化を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="border-b-2 border-shu/20 bg-gradient-to-b from-washi to-washi-dark backdrop-blur shadow-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="text-xl font-bold text-sumi tracking-wide hover:text-shu transition-colors flex items-center gap-2"
        >
          <span className="text-2xl">🗾</span>
          <span>民俗学マップ</span>
        </Link>
        <nav className="flex gap-6 items-center text-sm font-gothic-jp font-medium">
          <Link
            href="/"
            className="text-sumi/70 hover:text-shu transition-colors border-b-2 border-transparent hover:border-shu pb-1"
          >
            地図
          </Link>
          <Link
            href="/post"
            className="text-sumi/70 hover:text-shu transition-colors border-b-2 border-transparent hover:border-shu pb-1"
          >
            投稿
          </Link>
          <Link
            href="/review"
            className="text-sumi/70 hover:text-shu transition-colors border-b-2 border-transparent hover:border-shu pb-1"
          >
            レビュー
          </Link>
          <Link
            href="/flags"
            className="text-sumi/70 hover:text-shu transition-colors border-b-2 border-transparent hover:border-shu pb-1"
          >
            通報
          </Link>

          <div className="ml-4 pl-4 border-l border-sumi/20">
            {loading ? (
              <div className="text-xs text-sumi/50">読込中...</div>
            ) : user ? (
              <div className="flex items-center gap-3">
                <div className="text-xs text-sumi/70">
                  <div className="font-medium">{user.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-xs px-3 py-1.5 rounded-md bg-sumi/10 text-sumi hover:bg-shu hover:text-white transition-colors"
                >
                  ログアウト
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-xs px-3 py-1.5 rounded-md bg-shu text-white hover:bg-shu/90 transition-colors inline-block"
              >
                ログイン
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
