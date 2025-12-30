"use client";

import { createBrowserClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;
let cachedUrl: string | undefined = undefined;

/**
 * クライアントコンポーネントで再利用する Supabase ブラウザクライアント。
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase URL または Anon Key が未設定です。`.env` を確認してください。"
    );
  }

  // URLが変更された場合、キャッシュをクリア（開発環境対応）
  if (browserClient && cachedUrl !== url) {
    console.log(`Supabase URL changed from ${cachedUrl} to ${url}. Recreating client.`);
    browserClient = null;
  }

  if (browserClient) {
    return browserClient;
  }

  cachedUrl = url;
  console.log(`Creating Supabase browser client with URL: ${url}`);

  browserClient = createBrowserClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return window.document.cookie
          .split("; ")
          .find((row) => row.startsWith(name + "="))
          ?.split("=")[1];
      },
      set(name: string, value: string, options?: CookieOptions) {
        const opts = options ?? {};
        const parts = [`${name}=${value}`];
        if (opts.maxAge) parts.push(`Max-Age=${opts.maxAge}`);
        if (opts.domain) parts.push(`Domain=${opts.domain}`);
        if (opts.path) parts.push(`Path=${opts.path}`);
        if (opts.expires)
          parts.push(`Expires=${opts.expires.toUTCString()}`);
        if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
        if (opts.secure) parts.push("Secure");
        window.document.cookie = parts.join("; ");
      },
      remove(name: string, options?: CookieOptions) {
        const opts = options ?? {};
        const parts = [
          `${name}=`,
          "Max-Age=0",
          "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
        ];
        if (opts.domain) parts.push(`Domain=${opts.domain}`);
        if (opts.path) parts.push(`Path=${opts.path}`);
        parts.push("SameSite=Lax");
        window.document.cookie = parts.join("; ");
      },
    },
  });

  return browserClient;
}
