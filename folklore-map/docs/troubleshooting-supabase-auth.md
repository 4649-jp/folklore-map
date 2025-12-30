# Supabase認証トラブルシューティング記録

**日付**: 2025-12-04
**問題**: ブラウザから新規登録・ログインができない
**ステータス**: 解決済み

---

## 1. 問題の概要

### 症状
- ログインページで新規登録を試みると「サーバーに接続できませんでした。Supabaseサービスが起動しているか確認してください。」というエラーが表示される
- ブラウザのコンソールに `TypeError: Failed to fetch` エラーが出る
- ネットワークタブにSupabaseへの `signup` リクエストが表示されない

### 環境
- **サーバー**: Ubuntu Linux (192.168.0.238)
- **クライアント**: 別のPCのブラウザ (Windows + Edge)
- **Next.js**: 16.0.1
- **Supabase**: ローカル開発環境 (Docker)

---

## 2. 調査プロセス

### 2.1 サーバー側の確認

#### Supabase Health Check
```bash
# 外部IPからの接続テスト
curl http://192.168.0.238:54321/auth/v1/health
# 結果: {"version":"v2.180.0","name":"GoTrue",...} ✅ 成功

# ローカルホストからの接続テスト
curl http://127.0.0.1:54321/auth/v1/health
# 結果: 成功 ✅
```

#### Dockerポートバインディング確認
```bash
docker ps --filter "name=kong" --format "table {{.Names}}\t{{.Ports}}"
# 結果: 0.0.0.0:54321->8000/tcp ✅ 全インターフェースでリッスン
```

#### 環境変数確認
```bash
cat .env.local | grep SUPABASE
# NEXT_PUBLIC_SUPABASE_URL=http://192.168.0.238:54321 ✅
# NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_... ✅
```

### 2.2 クライアント側の確認

#### ブラウザコンソールログ
```
Creating Supabase browser client with URL: http://192.168.0.238:54321
```
→ Supabaseクライアントは正しいURLで初期化されている ✅

#### テストページでの直接接続テスト
`/test-auth` ページを作成し、ブラウザから直接Supabase APIに接続テスト:
```
✅ 環境変数読み込み成功
URL: http://192.168.0.238:54321

🔍 Supabase Health Checkを実行中...
❌ エラー発生: TypeError: Failed to fetch
```

### 2.3 サーバーサイドAPI経由のテスト

`/api/test-supabase` を作成し、サーバー経由で接続テスト:
```bash
curl http://192.168.0.238:3000/api/test-supabase
# 結果:
# ✅ Health Check: 成功
# ✅ Signup: 成功（ユーザー作成完了）
```

---

## 3. 原因の特定

### 接続パターン別結果

| 接続元 | 接続先 | 結果 |
|--------|--------|------|
| サーバー (curl) | 192.168.0.238:54321 | ✅ 成功 |
| サーバー (curl) | 127.0.0.1:54321 | ✅ 成功 |
| サーバー (Next.js API) | 192.168.0.238:54321 | ✅ 成功 |
| ブラウザ (別PC) | 192.168.0.238:54321 | ❌ 失敗 |

### 根本原因
**ネットワークレベルの問題**: ブラウザが動作している別のPCから、サーバーの `192.168.0.238:54321` ポートへのアクセスがブロックされている。

考えられる原因:
1. サーバー側のファイアウォール（ufw/iptables）がポート54321をブロック
2. ネットワーク機器（ルーター）の設定
3. Dockerのネットワーク設定

**注**: ポート3000（Next.js）へは接続できるため、完全なネットワーク遮断ではない。

---

## 4. 解決策

### 採用した解決策: サーバーサイド認証

ブラウザから直接Supabaseに接続するのではなく、Next.js API Routes経由で認証処理を行うように変更。

```
変更前:
ブラウザ → Supabase API (192.168.0.238:54321) ❌

変更後:
ブラウザ → Next.js API (/api/auth/*) → Supabase API ✅
```

### 作成したファイル

#### `/src/app/api/auth/signup/route.ts`
```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return NextResponse.json({ error: { message: error.message } }, { status: 400 });
  }

  // セッションCookieを設定
  const response = NextResponse.json({ success: true, user: data.user, session: data.session });
  // ... Cookie設定
  return response;
}
```

#### `/src/app/api/auth/signin/route.ts`
同様の構造でログイン処理を実装。

#### `/src/app/login/page.tsx` の変更
```typescript
// 変更前
const supabase = getSupabaseBrowserClient();
await supabase.auth.signUp({ email, password });

// 変更後
const response = await fetch("/api/auth/signup", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
```

---

## 5. その他の試みた解決策（効果なし）

### CSP (Content Security Policy) の緩和
```typescript
// next.config.ts
{
  key: "Content-Security-Policy",
  value: "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src * ws: wss:;",
}
```
→ CSPを完全に緩和しても `Failed to fetch` エラーは解消されなかった。
→ 問題はCSPではなく、ネットワークレベルにあることが判明。

### allowedDevOrigins の設定
```typescript
allowedDevOrigins: ["http://192.168.0.238:3000"]
```
→ これは `/_next/*` リソースへのクロスオリジンアクセスに関する設定で、Supabase認証とは無関係。

---

## 6. 検証結果

### サインアップAPIテスト
```bash
curl -X POST http://192.168.0.238:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"test123456"}'

# 結果: {"success":true,"user":{...},"session":{...}} ✅
```

### サインインAPIテスト
```bash
curl -X POST http://192.168.0.238:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"test123456"}'

# 結果: {"success":true,"user":{...},"session":{...}} ✅
```

---

## 7. 今後の推奨事項

### 本番環境での対応
1. **ファイアウォール設定の確認**: 本番環境ではSupabaseクラウドを使用するため、この問題は発生しない
2. **サーバーサイド認証の維持**: セキュリティ上、認証処理はサーバーサイドで行う方が安全

### ローカル開発環境での対応（オプション）
ファイアウォールでポート54321を許可する場合:
```bash
# UFWの場合
sudo ufw allow 54321/tcp

# iptablesの場合
sudo iptables -A INPUT -p tcp --dport 54321 -j ACCEPT
```

---

## 8. 関連ファイル

- `/src/app/api/auth/signup/route.ts` - サインアップAPI
- `/src/app/api/auth/signin/route.ts` - サインインAPI
- `/src/app/login/page.tsx` - ログインページ（修正済み）
- `/src/app/test-auth/page.tsx` - 診断用テストページ
- `/src/app/api/test-supabase/route.ts` - サーバーサイド接続テストAPI
- `/next.config.ts` - CSP設定（開発環境用に緩和）

---

## 9. 学んだこと

1. **「Failed to fetch」エラーは原因が多岐にわたる**: CORS、CSP、ネットワーク、ファイアウォールなど
2. **段階的なテストが重要**: サーバー側テスト → クライアント側テスト → 中間（API Routes）テストの順で切り分け
3. **サーバーサイド認証のメリット**: ネットワーク制限の影響を受けにくい、セキュリティ向上
4. **診断用エンドポイントの有用性**: `/api/test-supabase` のような診断用APIが問題切り分けに役立つ
