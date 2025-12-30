# アーキテクチャ概要

民俗学マップの技術アーキテクチャと設計判断について記載しています。

---

## システム構成図

```
┌─────────────────────────────────────────────────────────────┐
│                        ユーザー                              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                   Next.js 16 (App Router)                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  フロントエンド (React 19)                              │ │
│  │  - src/app/page.tsx (トップページ)                      │ │
│  │  - src/components/spot-map.tsx (地図表示)              │ │
│  │  - shadcn UI コンポーネント                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                        ↓                                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  API Routes (src/app/api/)                             │ │
│  │  - GET/POST /api/spots                                 │ │
│  │  - GET/PATCH /api/spots/[id]                           │ │
│  │  - POST /api/geocode                                   │ │
│  │  - POST /api/flags                                     │ │
│  │  - PATCH /api/flags/[id]                               │ │
│  └────────────────────────────────────────────────────────┘ │
└───────────────────┬───────────────────┬─────────────────────┘
                    │                   │
                    ↓                   ↓
    ┌───────────────────────┐  ┌──────────────────────┐
    │  Supabase Auth        │  │  Google Maps API     │
    │  - Cookie-based auth  │  │  - Maps JS API       │
    │  - Row Level Security │  │  - Geocoding API     │
    └───────────┬───────────┘  └──────────────────────┘
                │
                ↓
    ┌───────────────────────┐
    │  PostgreSQL           │
    │  (Supabase managed)   │
    │  ┌─────────────────┐  │
    │  │ spots           │  │
    │  │ sources         │  │
    │  │ flags           │  │
    │  │ spot_views      │  │
    │  └─────────────────┘  │
    │  ↑                    │
    │  │ Prisma ORM        │
    └──┴────────────────────┘
```

---

## 技術スタック

### フロントエンド

| 技術 | バージョン | 用途 |
|------|-----------|------|
| Next.js | 16.0.1 | フレームワーク（App Router） |
| React | 19.2.0 | UIライブラリ |
| TypeScript | 5.x | 型安全性 |
| Tailwind CSS | 4.x | スタイリング |
| shadcn/ui | - | UIコンポーネント |
| react-hook-form | 7.66.0 | フォーム管理 |
| zod | 4.1.12 | バリデーション |

### バックエンド

| 技術 | バージョン | 用途 |
|------|-----------|------|
| Prisma | 6.18.0 | ORM |
| Supabase SSR | 0.7.0 | 認証・データベース |
| PostgreSQL | 15+ | データベース（Supabase） |

### 外部サービス

| サービス | 用途 |
|---------|------|
| Google Maps JavaScript API | 地図表示、マーカー表示 |
| Google Geocoding API | 住所→座標変換 |
| Supabase Auth | ユーザー認証 |
| Supabase Database | PostgreSQL ホスティング |
| Supabase Storage | 画像アップロード（予定） |

---

## ディレクトリ構造

```
folklore-map/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   │   ├── spots/
│   │   │   ├── flags/
│   │   │   └── geocode/
│   │   ├── page.tsx           # トップページ
│   │   └── layout.tsx         # ルートレイアウト
│   │
│   ├── components/            # Reactコンポーネント
│   │   ├── ui/               # shadcn UIコンポーネント
│   │   └── spot-map.tsx      # 地図コンポーネント
│   │
│   └── lib/                   # ユーティリティ
│       ├── supabase/
│       │   ├── server.ts     # サーバー側Supabaseクライアント
│       │   └── client.ts     # クライアント側Supabaseクライアント
│       ├── db.ts             # Prismaクライアント
│       ├── auth.ts           # 認証ヘルパー
│       ├── http.ts           # HTTPレスポンスヘルパー
│       └── schemas/          # Zodスキーマ
│
├── prisma/
│   ├── schema.prisma         # データベーススキーマ
│   └── migrations/           # マイグレーションファイル
│
├── scripts/
│   └── seed-data.ts          # シードデータスクリプト
│
└── docs/
    ├── setup-guide.md        # 環境構築ガイド
    ├── development-log.md    # 開発ログ
    ├── api-reference.md      # APIリファレンス
    └── architecture.md       # このファイル
```

---

## データフロー

### スポット一覧表示

1. ユーザーがトップページにアクセス
2. `src/components/spot-map.tsx`がマウント
3. `GET /api/spots`を呼び出し
4. API RouteがPrismaでデータベースクエリ
5. 公開済みスポット（PUBLISHED）のみ返却
6. Google Maps APIでマーカーを地図上に配置

### スポット詳細表示

1. ユーザーがマーカーをクリック
2. `GET /api/spots/[id]`を呼び出し
3. API RouteがSupabase Authでセッション確認
4. 権限チェック:
   - PUBLISHED → 誰でも閲覧可
   - DRAFT/SUBMITTED → 作成者、reviewer、adminのみ
5. Prismaでスポットと関連sources取得
6. 詳細モーダルに表示

### スポット投稿

1. ユーザーが投稿フォームに入力
2. react-hook-formでフォームデータ収集
3. zodでクライアント側バリデーション
4. `POST /api/spots`を呼び出し
5. API Routeで再度zodバリデーション
6. Supabase Authで認証確認（editor以上）
7. Prismaでデータベースに挿入（status: DRAFT）
8. レスポンスを返却

---

## 認証・認可フロー

### 認証（Authentication）

1. Supabase Authのメールログイン/OAuth
2. JWTトークンをHTTP-only Cookieに保存
3. Next.js 16の`cookies()`でCookieを読み取り
4. Supabase SSRで`getSession()`呼び出し
5. セッション情報を取得

### 認可（Authorization）

1. セッションの`user.app_metadata.role`からロール取得
2. `src/lib/auth.ts`の`getUserRole()`でロール判定
3. `hasRole()`で権限チェック
4. 権限不足の場合は403 Forbiddenを返却

**ロール階層**:
```
admin > reviewer > editor > viewer
```

上位ロールは下位ロールの権限をすべて含みます。

---

## データベース設計

### 主要テーブル

#### spots（スポット）
民俗学伝承の位置情報

```sql
CREATE TABLE spots (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  lat DECIMAL NOT NULL,
  lng DECIMAL NOT NULL,
  blur_radius_m INTEGER NOT NULL,
  icon_type TEXT NOT NULL,
  era_hint TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  created_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL
);
```

#### sources（出典）
スポットの参考文献・出典URL

```sql
CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  spot_id TEXT NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  citation TEXT NOT NULL,
  url TEXT
);
```

#### flags（通報）
不適切なスポットの通報

```sql
CREATE TABLE flags (
  id TEXT PRIMARY KEY,
  spot_id TEXT NOT NULL REFERENCES spots(id),
  reason TEXT NOT NULL,
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## セキュリティ

### Row Level Security (RLS)

Supabase PostgreSQLでRLSポリシーを設定:

**spotsテーブル**:
- 誰でもPUBLISHEDスポットを参照可能
- editor以上が新規作成可能
- 作成者は自分のDRAFTを更新可能
- reviewer以上はすべてのスポットを更新可能

**sourcesテーブル**:
- spots経由でアクセス制御（CASCADE）

**flagsテーブル**:
- 誰でも通報作成可能
- reviewer以上が参照・更新可能

### 入力検証

1. **クライアント側**: react-hook-form + zod
2. **サーバー側**: zodで再検証（必須）

### XSS対策

- Reactのデフォルトエスケープに依存
- `dangerouslySetInnerHTML`は使用しない
- ユーザー入力はすべてサニタイズ

### CSRF対策

- Supabase Authのセッション検証
- SameSite Cookie属性

---

## 地理的プライバシー

### ぼかしアルゴリズム

正確な位置を隠すため、座標にランダムオフセットを適用:

```typescript
function applyBlur(
  lat: number,
  lng: number,
  radiusMeters: number
): { lat: number; lng: number } {
  const earthRadius = 6_378_137; // 地球の半径（メートル）
  const dn = (Math.random() * 2 - 1) * radiusMeters; // -radius ~ +radius
  const de = (Math.random() * 2 - 1) * radiusMeters;

  const dLat = dn / earthRadius;
  const dLng = de / (earthRadius * Math.cos((Math.PI * lat) / 180));

  return {
    lat: lat + (dLat * 180) / Math.PI,
    lng: lng + (dLng * 180) / Math.PI,
  };
}
```

### ぼかし半径の選択

| 信頼度 | ぼかし半径 |
|--------|----------|
| 0.9以上 | 300m |
| 0.6以上 | 200m |
| 0.6未満 | 100m |

---

## Next.js 16互換性対応

### 主な変更点

#### 1. Route Handler params

Next.js 16では`params`が非同期Promiseに変更:

```typescript
// Next.js 15以前
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params; // 直接アクセス
}

// Next.js 16
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // awaitが必要
}
```

#### 2. cookies() API

`cookies()`が非同期関数に変更:

```typescript
// Next.js 15以前
const cookieStore = cookies();

// Next.js 16
const cookieStore = await cookies();
```

#### 3. Supabase SSR統合

Cookie処理パターンが変更:

```typescript
// 古いパターン（Next.js 15以前）
cookies: {
  get(name: string) {
    return cookieStore.get(name)?.value;
  },
  set(name: string, value: string, options) {
    cookieStore.set(name, value, options);
  },
  remove(name: string, options) {
    // ...
  },
}

// 新しいパターン（Next.js 16）
cookies: {
  getAll() {
    return cookieStore.getAll();
  },
  setAll(cookiesToSet) {
    try {
      cookiesToSet.forEach(({ name, value, options }) =>
        cookieStore.set(name, value, options)
      );
    } catch {
      // Server Components can't write cookies
    }
  },
}
```

---

## パフォーマンス最適化

### 現在の実装

- Next.js App RouterのデフォルトSSR/SSG
- Google Maps APIの遅延ロード（importLibrary）
- Prisma接続プーリング

### 今後の改善予定

- [ ] React Server Componentsの活用
- [ ] 画像の最適化（next/image）
- [ ] ISR（Incremental Static Regeneration）の導入
- [ ] CDNキャッシング戦略
- [ ] データベースクエリの最適化（インデックス）

---

## モニタリング・ログ

現在、本番環境でのモニタリングは未実装。

### 今後の導入予定

- Vercel Analytics
- Sentry（エラートラッキング）
- Supabase Logs
- カスタムメトリクス（スポット閲覧数など）

---

## デプロイ戦略

### 推奨環境: Vercel

1. GitHubリポジトリと連携
2. 環境変数をVercelダッシュボードで設定
3. mainブランチへのpushで自動デプロイ
4. プレビューデプロイ（PR単位）

### 環境変数

本番環境で必要な環境変数:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
DATABASE_URL=postgresql://postgres:...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
GOOGLE_MAPS_API_KEY=AIzaSy...
```

---

## 参考資料

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [Supabase SSR Documentation](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)

---

**最終更新**: 2025-11-08
