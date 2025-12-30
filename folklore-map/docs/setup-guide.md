# ローカル環境構築ガイド

このガイドでは民俗学マップ（仮）をローカルで動かすための手順をまとめています。  
Ubuntu 22.04 以降 / macOS / WSL2 を想定し、Docker が利用できる場合は Supabase のローカル実行にも対応します。

---

## 1. 前提ソフトウェア

| ツール | 推奨バージョン | 備考 |
|-------|---------------|------|
| Node.js | 20.x LTS | `nvm install 20` などで導入 |
| pnpm | 10.x | `npm install -g pnpm` |
| Supabase CLI | 2.x | [リリースページ](https://github.com/supabase/cli/releases)のバイナリ or `brew install supabase/tap/supabase` |
| Docker | 24 以降 | Supabase ローカル実行に必須 |
| Python | 3.11 以降 | AI 前処理スクリプト用（後続タスク） |

> Docker が利用できない場合は、Supabase はクラウド環境を利用してください。

---

## 2. リポジトリのセットアップ

```bash
git clone <このリポジトリ>
cd folklore-map
pnpm install
```

---

## 3. 環境変数の設定

1. `.env.example` をコピーして `.env.local` を作成します。
2. 以下の値を埋めます。

```bash
cp .env.example .env.local
```

| 変数 | 説明 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase プロジェクトの URL と匿名キー |
| `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_JWT_SECRET` | サーバー側で利用するキー（RLS 設定用） |
| `DATABASE_URL` | Supabase Postgres への接続文字列 |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` / `GOOGLE_MAPS_API_KEY` | Google Maps / Geocoding 用 API キー |

> Google Maps API キーはブラウザ用（`NEXT_PUBLIC_*`）とサーバー用（`GOOGLE_MAPS_API_KEY`）の両方に設定しておくと、地図表示とジオコーディング API の両方で利用できます。

---

## 4. Supabase 設定

### 4.1 クラウド環境（推奨）
1. Supabase ダッシュボードで新規プロジェクトを作成。
2. `Project Settings > API` から URL, anon key, service role key を取得し、`.env.local` に反映。
3. SQL エディタで `../supabase/policies.sql` を実行し、RLS ポリシーを適用。
4. `setup.md` の手順に従い、ユーザーの `app_metadata` に `role` クレームを設定するとレビュー権限を制御できます。

### 4.2 ローカル環境（Docker 必須）
```bash
supabase init      # folklore-map/supabase/config.toml を生成済み
supabase start     # Docker が起動している必要があります
```

コマンド実行後に表示される `API URL` / `anon key` / `service key` を `.env.local` に転記します。  
完了したら `supabase db remote set` でクラウドと同期することも可能です。

> Docker が利用できない場合は、この手順はスキップしてクラウド環境で進めてください。

---

## 5. データベース初期化

`prisma/migrations/000_init.sql` に Prisma のスキーマから生成した初期化 SQL を用意しています。Supabase（Postgres）上で以下のいずれかの方法で反映してください。

### 5.1 Supabase SQL Editor を使う場合
1. プロジェクトの SQL Editor を開く。
2. `prisma/migrations/000_init.sql` の内容を貼り付けて実行。

### 5.2 Prisma CLI を使う場合
Postgres（Supabase）に接続できる状態で以下を実行します。

```bash
pnpm prisma migrate deploy
pnpm prisma generate
```

> `PRISMA_PROVIDER=postgresql` と `DATABASE_URL` の環境変数が正しく設定されている必要があります。`.env.local` に記載した接続文字列が利用されます。

初期データ投入が必要な場合は `prisma/seed.ts` を作成し、`pnpm prisma db seed` を実行する形が一般的です（現時点では未実装）。

---

## 6. 開発サーバーの起動

```bash
pnpm dev
```

ブラウザで `http://localhost:3000` を開くと、地図・スポット一覧・投稿フォームへの導線が表示されます。  
ログイン（Supabase Auth）を組み込む前段階でも投稿フォーム等の UI が確認できます。

---

## 7. Lint / テスト

```bash
pnpm lint
# （今後）pnpm test
```

---

## 8. トラブルシュート

### Google Maps が表示されない
- `.env.local` に `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` が設定されているか確認。
- API キーで Maps JavaScript API が有効化されているか確認。

### `/api/geocode` が 403 になる
- Supabase にログインしていない可能性があります。編集者ロールの JWT が付与されている必要があります。

### Supabase CLI が Docker に接続できない
- Docker が起動中か確認します。`sudo systemctl status docker` などで確認後、`sudo systemctl start docker` を実行してください。
- WSL2 では Docker Desktop を起動する必要があります。

### スポット詳細取得で "cookieStore.get is not a function" エラーが出る
- Next.js 16 では `cookies()` API と Supabase SSR の連携方法が変更されました。
- `src/lib/supabase/server.ts` で `getAll()` / `setAll()` パターンを使用する必要があります（2025年1月時点の推奨実装）。
- 詳細は [Supabase公式ドキュメント](https://supabase.com/docs/guides/auth/server-side/nextjs) を参照してください。

---

## 9. 参考資料
- `setup.md`：作業ログと実行コマンド
- `supabase/README.md`：Supabase でのロール付与・RLS 設計メモ
- `requirements.md` / `basic_design.md` / `detailed_design.md`：要件・設計資料

環境構築で不明点があれば `tasks.md` の T01/T04/T05 の備考や `setup.md` を参照しながら進めてください。
