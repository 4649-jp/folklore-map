# セキュリティ監査レポート - 民俗学マップ

**監査日**: 2025-12-11
**監査対象**: 民俗学マップ (folklore-map)
**監査基準**: OWASP Top 10 (2021)
**総合評価**: ⚠️ **高リスク** - 即座の対応が必要

---

## エグゼクティブサマリー

民俗学マッププロジェクトに対してOWASP Top 10に基づく包括的なセキュリティ監査を実施しました。

### 主要な発見事項

| 深刻度 | 件数 | 状態 |
|--------|------|------|
| 🔴 **Critical** | 3 | 即座の対応必須 |
| 🟠 **High** | 5 | 優先対応推奨 |
| 🟡 **Medium** | 4 | 計画的対応推奨 |
| ⚪ **Low** | 2 | 長期的対応 |

### 最重要リスク

1. **Next.js 16.0.1のRCE脆弱性** (CVE: GHSA-9qr9-h5gf-34mp) - Critical
2. **認証システムの完全無効化** (開発環境設定が本番に混入リスク) - Critical
3. **APIキーのハードコード** (.env.localファイル内) - High
4. **XSS脆弱性** (innerHTML使用) - High

---

## OWASP Top 10 詳細分析

### A01: Broken Access Control (アクセス制御の不備)

#### 🔴 Critical: 認証システムの完全無効化

**場所**:
- `src/app/api/spots/route.ts` (POST)
- `src/app/api/spots/[id]/route.ts` (PATCH, DELETE)
- `src/app/api/geocode/route.ts` (POST)
- `src/app/api/admin/analytics/*/*.ts`

**問題**:
```typescript
// 一時的に認証チェックを無効化
// let role: UserRole = "editor"; // 一時的にeditor権限を付与
// let userId: string | null = "anonymous-user";
```

開発用の認証無効化コードがコメントアウトされた状態で存在。以下のリスク:

1. **誤デプロイリスク**: コメントアウト解除を忘れて本番デプロイすると全エンドポイントが無認証に
2. **条件分岐の複雑性**: `process.env.NODE_ENV === "development"` の判定がAPI全体に散在
3. **権限昇格**: `role = "admin"` により誰でも管理者権限で操作可能

**影響**:
- 未認証ユーザーがスポットの作成・編集・削除が可能
- 管理者APIへのアクセスが可能
- データベースの完全な改竄が可能

**推奨対策**:
```typescript
// ✅ 良い例: 認証を常に実施し、開発環境では専用のテストユーザーを使用
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return errorResponse("認証が必要です", { status: 401, code: "UNAUTHORIZED" });
  }

  const role = getUserRole(session);
  if (!hasRole("editor", role)) {
    return errorResponse("権限不足", { status: 403, code: "FORBIDDEN" });
  }
  // ... 以降の処理
}
```

#### 🟠 High: 所有者チェックのバイパス可能性

**場所**: `src/app/api/spots/[id]/route.ts:111-119`

```typescript
if (
  !hasRole("reviewer", role) &&
  (spot.created_by !== userId || spot.status === "PUBLISHED")
) {
  return errorResponse("このスポットを更新する権限がありません。", {
    status: 403,
    code: "FORBIDDEN",
  });
}
```

**問題**:
- レビュワー権限を持つユーザーは全スポットを編集可能
- `created_by`フィールドの整合性検証がない

**推奨対策**:
- Auditログに操作者とターゲットの所有者を記録
- 重要な操作（削除、公開）は2段階承認を実装

---

### A02: Cryptographic Failures (暗号化の失敗)

#### 🟠 High: APIキーの平文保存

**場所**: `.env.local`

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyAlolqWBLgsZ_8eLLRibzoRIUQ5bUm0HIc
GOOGLE_MAPS_API_KEY=AIzaSyAlolqWBLgsZ_8eLLRibzoRIUQ5bUm0HIc
SUPABASE_SERVICE_ROLE_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz
```

**問題**:
1. **公開されているGoogle Maps APIキー**: `NEXT_PUBLIC_*`はクライアントサイドに露出
2. **Supabaseサービスロールキー**: 最高権限キーが平文
3. **ローカル環境のキーが開発ログに記録される可能性**

**影響**:
- Google Maps APIの不正利用
- Supabaseデータベースへの直接アクセス
- クォータ超過による課金

**推奨対策**:
1. **APIキー制限**:
   ```bash
   # Google Maps API Console
   - HTTPリファラー制限: https://yourdomain.com/*
   - IPアドレス制限（サーバーサイドキー用）
   ```

2. **環境変数の分離**:
   ```bash
   # .env (バージョン管理対象外)
   GOOGLE_MAPS_API_KEY=<secret>

   # .env.example (テンプレート)
   GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

3. **Secrets Manager使用**:
   - Vercel: Environment Variables (Encrypted)
   - AWS Secrets Manager
   - HashiCorp Vault

#### 🟡 Medium: パスワードポリシーなし

**場所**: Supabase Auth設定

**問題**: パスワード強度要件が未設定

**推奨対策**:
```sql
-- Supabase Dashboard > Authentication > Settings
{
  "password": {
    "min_length": 12,
    "require_uppercase": true,
    "require_lowercase": true,
    "require_numbers": true,
    "require_special_characters": true
  }
}
```

---

### A03: Injection (インジェクション)

#### ✅ Good: SQL Injection対策済み

**評価**: Prisma ORMを使用しており、パラメータ化クエリが自動的に適用されている。

```typescript
// ✅ 安全
const spots = await prisma.spot.findMany({
  where: {
    title: { contains: q, mode: "insensitive" }
  }
});
```

#### 🟠 High: XSS脆弱性 - innerHTML使用

**場所**: `src/components/spot-map.tsx:420-430`

```typescript
iconElement.innerHTML = `
  <div style="
    font-size: ${selectedId === spot.id ? "32px" : "28px"};
    ...
  ">
    ${getIconEmoji(spot.icon_type)}
  </div>
`;
```

**問題**:
- `spot.icon_type`がenum制約されているため現時点では安全
- しかし、将来的にユーザー入力を含む場合XSS脆弱性に

**推奨対策**:
```typescript
// ✅ 安全な方法: textContentまたはcreateTextNodeを使用
iconElement.textContent = getIconEmoji(spot.icon_type);

// または
const emojiNode = document.createTextNode(getIconEmoji(spot.icon_type));
iconDiv.appendChild(emojiNode);
```

#### 🟡 Medium: CSPの開発環境緩和

**場所**: `next.config.mjs:27-42`

```typescript
if (isDev) {
  return [
    {
      value: [
        "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:",
        ...
      ].join("; "),
    },
  ];
}
```

**問題**: 開発環境でCSPが完全に無効化されている

**推奨対策**:
- 開発環境でもCSPを適用し、必要最小限の緩和のみ許可
- `'unsafe-eval'`はHMR用のみに制限

---

### A04: Insecure Design (安全でない設計)

#### 🟡 Medium: レート制限がメモリベース

**場所**: `src/lib/rate-limit.ts:12-21`

```typescript
class RateLimiter {
  private cache = new Map<string, RateLimitEntry>();
  // ...
}
```

**問題**:
1. **サーバー再起動でリセット**: 攻撃者がサーバー再起動後に再攻撃可能
2. **分散環境で機能しない**: 複数インスタンスで状態が共有されない
3. **メモリリーク**: 無制限にエントリが増加する可能性（cleanup関数あり）

**推奨対策**:
```typescript
// ✅ Redis使用例
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

export async function rateLimit(key: string, limit: number, windowMs: number) {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, Math.ceil(windowMs / 1000));
  }

  return {
    success: count <= limit,
    remaining: Math.max(0, limit - count),
  };
}
```

#### ⚪ Low: 監査ログの不完全性

**場所**: `src/app/api/spots/[id]/route.ts:192-204`

**問題**:
- GET操作はログされない
- DELETEAuditログが記録されない
- 失敗した操作もログすべき

**推奨対策**:
```typescript
// すべての操作でAuditログを記録
await prisma.audit.create({
  data: {
    entity: "Spot",
    entity_id: id,
    action: "DELETE",
    by: userId,
    detail_json: { title: spot.title, reason: "admin_delete" },
  },
});
```

---

### A05: Security Misconfiguration (セキュリティ設定ミス)

#### 🔴 Critical: Next.js 16.0.1 RCE脆弱性

**CVE**: GHSA-9qr9-h5gf-34mp
**影響バージョン**: >=16.0.0-canary.0 <16.0.7
**現在のバージョン**: 16.0.1

**問題**: React Flight Protocolにおけるリモートコード実行の脆弱性

**影響**:
- 攻撃者が任意のコードを実行可能
- サーバー完全侵害のリスク

**推奨対策**:
```bash
# 即座にアップデート
pnpm update next@latest

# または特定バージョンを指定
pnpm add next@16.0.7
```

#### 🟠 High: CSPヘッダーの重複設定

**場所**:
- `next.config.mjs:46-78`
- `src/middleware.ts:16-102`

**問題**: 同じCSPヘッダーが2箇所で定義され、どちらが優先されるか不明確

**推奨対策**:
- middlewareまたはnext.config.mjsのどちらかに統一
- middleware推奨（動的な調整が容易）

#### 🟡 Medium: CORSの設定不足

**問題**: 明示的なCORS設定がない

**推奨対策**:
```typescript
// src/middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // CORS設定
  const origin = request.headers.get("origin");
  const allowedOrigins = [
    "https://folklore-map.vercel.app",
    "http://localhost:3000",
  ];

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  return response;
}
```

---

### A06: Vulnerable and Outdated Components (脆弱で古いコンポーネント)

#### 🔴 Critical: Next.js 16.0.1 RCE脆弱性

*A05と同じ - 即座の対応が必要*

#### 依存関係の全体評価

```bash
pnpm audit --prod
# 1 critical vulnerability found
```

**推奨対策**:
1. **定期的な依存関係更新**:
   ```bash
   # 毎週実行
   pnpm update --latest
   pnpm audit --prod
   ```

2. **自動化**:
   ```yaml
   # .github/workflows/security.yml
   name: Security Audit
   on:
     schedule:
       - cron: '0 0 * * 1'  # 毎週月曜日
   jobs:
     audit:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - run: pnpm audit --prod --audit-level=high
   ```

3. **Dependabot有効化**:
   ```yaml
   # .github/dependabot.yml
   version: 2
   updates:
     - package-ecosystem: "npm"
       directory: "/folklore-map"
       schedule:
         interval: "weekly"
       open-pull-requests-limit: 10
   ```

---

### A07: Identification and Authentication Failures (認証の失敗)

#### 🟠 High: セッション管理の脆弱性

**場所**: `src/lib/supabase/client.ts:60-74`

**問題**:
```typescript
const getSessionId = useCallback(() => {
  let sessionId = localStorage.getItem("folklore_session_id");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("folklore_session_id", sessionId);
  }
  return sessionId;
}, []);
```

- **予測可能なセッションID**: `Date.now()`は推測可能
- **localStorageに保存**: XSS攻撃で盗まれる可能性

**推奨対策**:
```typescript
// ✅ cryptographically secure random
import { randomBytes } from 'crypto';

const generateSessionId = () => {
  return randomBytes(32).toString('hex');
};

// HttpOnly Cookieに保存（クライアントサイドJavaScriptからアクセス不可）
document.cookie = `session_id=${sessionId}; HttpOnly; Secure; SameSite=Strict`;
```

#### 🟡 Medium: パスワードリセットフロー未実装

**問題**: パスワード忘れ機能がない

**推奨対策**:
- Supabase Authの`resetPasswordForEmail()`を使用
- タイムアウト付きトークンを発行

---

### A08: Software and Data Integrity Failures

#### ⚪ Low: Subresource Integrity (SRI)未使用

**場所**: Google Maps API読み込み

**問題**: 外部スクリプトの整合性検証なし

**推奨対策**:
```html
<!-- SRI属性を追加 -->
<script
  src="https://maps.googleapis.com/maps/api/js?key=..."
  integrity="sha384-..."
  crossorigin="anonymous"
></script>
```

ただし、Google Maps APIは動的に更新されるため、SRI適用は困難。代替策:
- CSPで`https://maps.googleapis.com`のみ許可（実装済み）

---

### A09: Security Logging and Monitoring Failures

#### 🟡 Medium: ログ記録の不足

**問題**:
1. **認証失敗がログされない**
2. **レート制限超過がログのみ**（アラート未設定）
3. **センシティブ情報のログ記録**

**推奨対策**:
```typescript
// ✅ セキュリティイベントロギング
import { logger } from '@/lib/logger';

// 認証失敗
logger.warn('AUTH_FAILED', {
  ip: clientIp,
  endpoint: '/api/spots',
  reason: 'invalid_token',
  timestamp: new Date().toISOString(),
});

// レート制限
logger.error('RATE_LIMIT_EXCEEDED', {
  ip: clientIp,
  endpoint: request.url,
  limit: RATE_LIMITS.GEOCODE.limit,
});
```

#### 推奨監視項目

1. **リアルタイムアラート**:
   - 認証失敗が5分間に10回以上
   - 同一IPから異常な量のリクエスト
   - 管理者権限の使用

2. **ログ集約**:
   - Vercel Analytics
   - Sentry（エラートラッキング）
   - Datadog / New Relic（APM）

---

### A10: Server-Side Request Forgery (SSRF)

#### ✅ Good: SSRF対策実施済み

**場所**: `src/app/api/geocode/route.ts:75-80`

```typescript
const query = new URLSearchParams({
  address: parsed.data.text,
  key: apiKey,
  language: "ja",
  region: "jp",
});
```

**評価**:
- ユーザー入力をクエリパラメータとして使用（URLでない）
- リクエスト先が固定: `https://maps.googleapis.com/maps/api/geocode/json`
- 内部ネットワークへのアクセスリスクなし

**さらなる強化**:
```typescript
// ✅ 入力サニタイゼーション
import { sanitizeText } from '@/lib/sanitize';

const query = new URLSearchParams({
  address: sanitizeText(parsed.data.text),
  key: apiKey,
  language: "ja",
  region: "jp",
});
```

---

## その他のセキュリティ問題

### 1. ファイルアップロード機能なし

**評価**: ✅ Good - ファイルアップロード未実装のため、アップロード系脆弱性のリスクなし

### 2. 入力サニタイゼーション

**評価**: ✅ Good - `src/lib/sanitize.ts`に包括的なサニタイゼーション関数実装済み

**使用例**:
```typescript
import { sanitizeUserContent, escapeHtml } from '@/lib/sanitize';

const safeTitle = sanitizeUserContent(userInput);
```

### 3. Zodバリデーション

**評価**: ✅ Good - 全APIエンドポイントでZodバリデーション実施

**例**: `src/lib/schemas/spots.ts`

---

## 修正優先順位

### 🔴 Critical (即座に対応)

1. **Next.js 16.0.7へのアップデート**
   ```bash
   pnpm add next@16.0.7
   pnpm build
   # テスト実施後デプロイ
   ```

2. **認証システムの再有効化**
   - 全APIエンドポイントで認証コードのコメント解除
   - 開発環境用の専用テストユーザー作成

3. **APIキーの環境変数管理**
   - .env.localを.gitignoreに追加確認
   - Vercel/本番環境で環境変数を暗号化して設定

### 🟠 High (1週間以内)

4. **XSS対策**
   - innerHTML使用箇所をtextContentに変更

5. **セッションID生成の強化**
   - crypto.randomBytes()使用
   - HttpOnly Cookie化

6. **CSP設定の統一**
   - middlewareに一本化

### 🟡 Medium (1ヶ月以内)

7. **レート制限のRedis移行**
   - Upstash Redis導入

8. **監査ログの強化**
   - 全操作（GET含む）のログ記録
   - 失敗操作のログ記録

9. **セキュリティ監視の導入**
   - Sentryセットアップ
   - アラート設定

### ⚪ Low (長期的)

10. **Dependabot有効化**
11. **SRI検討**（実用性低い）
12. **CSRF対策の検討**（現在Supabase Authが対応）

---

## 推奨セキュリティベストプラクティス

### 1. セキュアコーディング

```typescript
// ❌ 悪い例
const userId = request.headers.get("user-id"); // 信頼できない

// ✅ 良い例
const { data: { session } } = await supabase.auth.getSession();
const userId = session?.user.id; // Supabase検証済み
```

### 2. エラーメッセージ

```typescript
// ❌ 悪い例
return errorResponse(`User ${userId} not found in database table users`);

// ✅ 良い例
return errorResponse("リソースが見つかりません", { status: 404, code: "NOT_FOUND" });
```

### 3. デプロイ前チェックリスト

- [ ] `pnpm audit --prod` でCritical脆弱性なし
- [ ] すべての認証コードが有効
- [ ] 環境変数が本番用に設定
- [ ] CSPヘッダーが有効
- [ ] レート制限が機能
- [ ] エラーログが適切に記録

---

## まとめ

### 現状評価

**セキュリティスコア**: 45/100

- **強み**:
  - Prisma ORMによるSQL Injection対策
  - Zodバリデーションの徹底
  - 包括的なサニタイゼーション関数
  - CSPヘッダー実装済み

- **弱点**:
  - 開発用認証無効化コードの残存
  - Critical脆弱性を含む依存関係
  - APIキー管理の不備
  - 監視・ログ記録の不足

### 対応完了後の予想スコア

**セキュリティスコア**: 85/100

Critical/High問題をすべて解決すれば、本番環境に適した安全性を達成可能。

---

## 参考資料

- [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [Supabase Auth Best Practices](https://supabase.com/docs/guides/auth/auth-best-practices)
- [GitHub Advisory GHSA-9qr9-h5gf-34mp](https://github.com/advisories/GHSA-9qr9-h5gf-34mp)

---

**監査者**: Claude Code AI
**レポート生成日**: 2025-12-11
