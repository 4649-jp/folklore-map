# Supabase 設定メモ

## 1. プロジェクト初期設定
1. Supabase プロジェクトを作成し、`Project Settings > API` から `Project URL` と `anon key`・`service role key` を取得。
2. `.env.local`（または `.env`）に以下の値を設定：
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=****************
   SUPABASE_SERVICE_ROLE_KEY=****************
   SUPABASE_JWT_SECRET=****************
   ```
3. `Auth > Providers` で Email (Magic Link) を有効化。ロール付与を自動化する場合は `Auth Hooks` を使用。

## 2. RLS ポリシー適用
- `supabase/policies.sql` に RLS ポリシーのサンプルを記載。Supabase SQL Editor で順に実行する。
- JWT クレーム（例：`auth.jwt() ->> 'role'`）に `reviewer` / `admin` 等のロール文字列が格納されている前提。
- 投稿者には `created_by` に `auth.uid()` が保存されるよう、API 実装側で制御する。

## 3. ロールクレームの付与例
```sql
-- Edge Function や PostgREST でサインアップ時にロールを埋め込むイメージ
-- SQL: auth.users.app_metadata -> { "role": "editor" }
update auth.users
set app_metadata = jsonb_set(coalesce(app_metadata, '{}'::jsonb), '{role}', to_jsonb('editor'))
where id = '00000000-0000-0000-0000-000000000000';
```

## 4. 参考リンク
- https://supabase.com/docs/guides/auth
- https://supabase.com/docs/guides/auth/row-level-security
- https://github.com/supabase/cli
