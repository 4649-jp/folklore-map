# デプロイガイド

このドキュメントでは、民俗学マップをVercel + Supabaseにデプロイする手順を説明します。

---

## 前提条件

- [Vercel](https://vercel.com/) アカウント
- [Supabase](https://supabase.com/) アカウント
- Git リポジトリ (GitHub/GitLab/Bitbucket)

---

## 1. Supabase本番環境のセットアップ

### 1.1 新しいプロジェクトを作成

1. [Supabase Dashboard](https://supabase.com/dashboard) にアクセス
2. 「New Project」をクリック
3. プロジェクト名: `folklore-map-production`
4. データベースパスワードを設定（強力なパスワードを使用）
5. リージョン: `Northeast Asia (Tokyo)` を選択
6. 「Create new project」をクリック

### 1.2 データベーススキーマの適用

```bash
cd folklore-map

# DATABASE_URLを本番環境に設定
export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Prismaスキーマをプッシュ
pnpm prisma db push

# RLSポリシーを適用
psql $DATABASE_URL < ../supabase/policies.sql
```

### 1.3 認証設定

1. Supabase Dashboard → Authentication → Providers
2. **Email** プロバイダーを有効化
3. 必要に応じて **Google OAuth** / **GitHub OAuth** を設定

### 1.4 環境変数の取得

Supabase Dashboard → Settings → API から以下を取得：

- `NEXT_PUBLIC_SUPABASE_URL`: `https://[YOUR-PROJECT-REF].supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `eyJ...` (anon public key)
- `SUPABASE_SERVICE_ROLE_KEY`: `eyJ...` (service_role secret key)

---

## 2. Google Maps API キーの取得

### 2.1 Google Cloud Consoleでプロジェクト作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成: `folklore-map-prod`
3. APIとサービス → ライブラリ
4. 以下のAPIを有効化：
   - **Maps JavaScript API**
   - **Geocoding API**

### 2.2 APIキーの作成

1. APIとサービス → 認証情報
2. 「認証情報を作成」→「APIキー」
3. **2つのAPIキーを作成**:
   - **クライアント用** (ブラウザ制限)
     - アプリケーションの制限: HTTPリファラー
     - リファラー: `https://your-domain.vercel.app/*`
   - **サーバー用** (IP制限)
     - アプリケーションの制限: IPアドレス
     - IP: VercelのアウトバウンドcIPアドレス（後述）

### 2.3 請求の設定

Google Maps APIは従量課金制です：
- **Maps JavaScript API**: $7/1000 requests
- **Geocoding API**: $5/1000 requests
- 無料枠: 月$200相当

請求アカウントを設定してください。

---

## 3. Vercelへのデプロイ

### 3.1 GitHubリポジトリの準備

```bash
# Gitリポジトリの初期化（未実施の場合）
cd /home/test/codex-test
git init
git add .
git commit -m "Initial commit: 民俗学マップ"

# GitHubにプッシュ
git remote add origin https://github.com/YOUR-USERNAME/folklore-map.git
git branch -M main
git push -u origin main
```

### 3.2 Vercelプロジェクトの作成

1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. 「Add New」→「Project」
3. GitHubリポジトリを接続
4. **Framework Preset**: Next.js
5. **Root Directory**: `folklore-map`
6. **Build Command**: `pnpm build`
7. **Install Command**: `pnpm install`

### 3.3 環境変数の設定

Vercel Dashboard → Settings → Environment Variables

以下の環境変数を追加：

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...  # クライアント用APIキー
GOOGLE_MAPS_API_KEY=AIzaSy...              # サーバー用APIキー
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres
NEXT_PUBLIC_SITE_NAME=民俗学マップ
```

**重要**: `Production`, `Preview`, `Development` すべてにチェックを入れる。

### 3.4 デプロイ実行

1. 「Deploy」ボタンをクリック
2. ビルドログを確認
3. デプロイ完了後、URLをクリックして動作確認

---

## 4. カスタムドメインの設定（オプション）

### 4.1 ドメインの追加

1. Vercel Dashboard → Settings → Domains
2. 「Add」をクリック
3. ドメイン名を入力: `folklore-map.yourdomain.com`
4. DNSレコードを設定:
   - **Type**: CNAME
   - **Name**: `folklore-map` (またはサブドメイン)
   - **Value**: `cname.vercel-dns.com`

### 4.2 SSL証明書

Vercelが自動的にLet's EncryptでSSL証明書を発行します。

---

## 5. 初期データの投入

### 5.1 シードデータのインポート

```bash
# 本番データベースに接続
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres"

# サンプルデータをインポート
cd folklore-map
pnpm tsx scripts/seed-data-100.ts
```

### 5.2 管理者ユーザーの作成

1. Vercelアプリにアクセス
2. サインアップ
3. Supabase Dashboard → Authentication → Users
4. 作成したユーザーを選択
5. User Metadata → Edit
6. 以下のJSONを追加:
   ```json
   {
     "app_metadata": {
       "role": "admin"
     }
   }
   ```
7. Save

---

## 6. 監視とバックアップ

### 6.1 エラートラッキング (Sentry)

```bash
pnpm add @sentry/nextjs
pnpm sentry:init
```

`sentry.client.config.ts` と `sentry.server.config.ts` を設定。

### 6.2 データベースバックアップ

Supabase Dashboardでバックアップ設定：
- Settings → Database → Backups
- **Point-in-Time Recovery (PITR)**: 有効化（Proプラン以上）
- **Daily Backups**: 自動（全プランで利用可能）

### 6.3 Vercel Analytics

Vercel Dashboard → Analytics → Enable

---

## 7. パフォーマンス最適化

### 7.1 画像最適化

Next.js Image コンポーネントを使用（自動最適化）。

### 7.2 CDN

Vercelが自動的にEdge Network経由で配信。

### 7.3 データベースクエリ最適化

```sql
-- インデックスの確認
SELECT * FROM pg_indexes WHERE tablename = 'Spot';

-- 必要に応じてインデックスを追加
CREATE INDEX idx_spot_status_updated ON "Spot"(status, updated_at);
```

---

## 8. トラブルシューティング

### ビルドエラー: "Module not found"

**原因**: 依存関係の不一致

**解決**:
```bash
rm -rf node_modules .next pnpm-lock.yaml
pnpm install
pnpm build
```

### データベース接続エラー

**原因**: DATABASE_URLが間違っている

**解決**:
1. Supabase Dashboard → Settings → Database → Connection string
2. `Transaction` プールではなく `Session` プールのURLを使用
3. Vercelの環境変数を更新

### Google Maps が表示されない

**原因**: APIキーのリファラー制限

**解決**:
1. Google Cloud Console → 認証情報
2. APIキーの設定で `https://your-domain.vercel.app/*` を追加

### RLSポリシーエラー

**原因**: Row Level Security ポリシーが適用されていない

**解決**:
```bash
psql $DATABASE_URL < ../supabase/policies.sql
```

---

## 9. 運用手順書

### 9.1 新機能のデプロイ

```bash
git checkout -b feature/new-feature
# 開発作業
git add .
git commit -m "feat: 新機能の実装"
git push origin feature/new-feature
```

GitHub でPull Requestを作成 → Vercel が自動的にPreview環境を作成

### 9.2 ロールバック

Vercel Dashboard → Deployments → 以前のデプロイを選択 → 「Promote to Production」

### 9.3 データベースマイグレーション

```bash
# マイグレーションファイルの作成
pnpm prisma migrate dev --name add_new_field

# 本番環境に適用
export DATABASE_URL="[PRODUCTION_URL]"
pnpm prisma migrate deploy
```

---

## 10. コスト見積もり

### 無料枠内で運用可能な規模

| サービス | 無料枠 | 想定利用 |
|---------|--------|---------|
| Vercel | 100GB帯域幅/月 | ~1万PV/月まで |
| Supabase | 500MB DB, 1GB Storage | ~5000スポットまで |
| Google Maps | $200/月相当 | ~2.8万マップ表示/月 |

### 有料プラン移行の目安

- **Vercel Pro ($20/月)**: 月10万PV超
- **Supabase Pro ($25/月)**: DB 8GB超、PITR必要時
- **Google Maps**: 月$200超（約3万リクエスト超）

---

## 11. セキュリティチェックリスト

- [ ] Supabase RLSポリシーが有効
- [ ] 環境変数に秘密鍵が含まれていない（`.env`はgitignore）
- [ ] Google Maps APIキーにリファラー制限
- [ ] Vercel の環境変数が正しく設定
- [ ] CSPヘッダーが有効
- [ ] HTTPS強制（Vercel自動）
- [ ] レート制限が実装済み
- [ ] 入力サニタイゼーションが実装済み

---

## 12. 次のステップ

デプロイ後の推奨作業：
1. ✅ **動作確認**: 全機能のE2Eテスト
2. ✅ **監視設定**: Sentry + Vercel Analytics
3. ✅ **ドキュメント整備**: README更新
4. ✅ **ユーザー招待**: 初期テストユーザーの登録
5. ✅ **フィードバック収集**: バグレポート・機能要望の収集

---

**最終更新**: 2025-11-12
