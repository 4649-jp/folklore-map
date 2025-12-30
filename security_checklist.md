# セキュリティ詳細（実装チェックリスト）

## ヘッダ/CSP
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), camera=(), microphone=()`
- `Content-Security-Policy`（初期案）：
  - `default-src 'self';`
  - `img-src 'self' https: data:;`
  - `script-src 'self' 'unsafe-inline' https://maps.googleapis.com;`
  - `connect-src 'self' https://*.supabase.co;`
  - `style-src 'self' 'unsafe-inline';`

## 認証・認可
- Supabase Auth（メールリンク）＋RLS
- ロール：viewer/editor/reviewer/admin（JWTクレーム）
- 実装：`lib/auth.ts` で `getUserRole()` を提供

## 入力検証
- すべてのRoute HandlersでZodチェック
- アップロード画像：拡張子・サイズ制限、EXIF除去

## レートリミット
- `/api/geocode`：1 IP 30 req/min、429時は`Retry-After`付与

## 差別・偏見対策
- NG辞書：被差別部落等のキーワード＋地名の同時登場は禁止、非公開に回す
- 表示：抽象化した説明、具体住所は表示しない
- 座標ぼかしの**必須化**

## ログ/監査
- PIIログ禁止、監査テーブルに主要操作を記録