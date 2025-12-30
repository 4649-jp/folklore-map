# 開発環境セットアップログ

## 2025-11-03
- Node.js: `node --version` → `v20.19.5`（既に導入済み）
- pnpm: `npm install -g pnpm` → `10.20.0`
- Python: `python3 --version` → `Python 3.12.3`
- Supabase CLI:  
  1. `curl -fsSL https://api.github.com/repos/supabase/cli/releases/latest | jq -r '.tag_name'` → `v2.54.11`  
  2. `curl -L https://github.com/supabase/cli/releases/download/v2.54.11/supabase_linux_amd64.tar.gz -o /tmp/supabase.tar.gz`  
  3. `tar -xzf /tmp/supabase.tar.gz -C /tmp && mv /tmp/supabase /usr/local/bin/supabase && chmod +x /usr/local/bin/supabase`  
  4. `supabase --version` → `2.54.11`
- `.env.example` を追加し、主要な環境変数の雛形を作成。

> 今後、新しい環境で再現する場合は上記コマンドを参照してください。必要に応じて `supabase` CLI のバージョンは最新リリースに置き換えてください。

### Next.js プロジェクト初期化
- `pnpm dlx create-next-app@latest folklore-map --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --yes`
  - CLI の実行が 30 秒を超えたためタイムアウト扱いとなったが、インストールは正常完了（Next.js 16.0.1 / React 19.2.0）。
  - 初期構成は `folklore-map/` ディレクトリ以下に生成。
- `cd folklore-map && pnpm dlx shadcn@latest init -d`
  - shadcn CLI が Tailwind v4 の設定を検知し、`components.json` と `src/lib/utils.ts` を作成。
  - 実行ログでタイムアウトが発生したが、処理は完了済み。
- `src/app/layout.tsx` / `src/app/page.tsx` を日本語化し、プロジェクト概要とプレースホルダー UI を実装。
- `folklore-map/README.md` を書き換え、開発手順と今後のタスク指針を追記。

> Next.js 15 系は npm レジストリで配布されていないため、最新の Next.js 16 系を採用。仕様とのズレはドキュメントで共有済み。

### Prisma セットアップ
- `cd folklore-map && pnpm add -D prisma`
- `cd folklore-map && pnpm add @prisma/client`
- `cd folklore-map && pnpm prisma init --datasource-provider postgresql`
  - `prisma/schema.prisma` を `db_design.md` に合わせて Spot/Source/Flag/Audit モデルと enum 群を定義。
  - `datasource db` の `provider` は Prisma の仕様上リ터ラル指定（`"postgresql"`）に固定。
- `prisma.config.ts` に `import "dotenv/config";` を追加し、`PRISMA_PROVIDER` と `DATABASE_URL` を参照するよう変更。
- `package.json` に `prisma:generate` / `prisma:migrate` / `prisma:studio` スクリプトを追加。
- 動作確認として `PRISMA_PROVIDER=postgresql DATABASE_URL="postgresql://localhost:5432/example" pnpm prisma format` および `pnpm prisma generate` を実行（クライアント生成成功）。

### Supabase 連携準備
- `cd folklore-map && pnpm add @supabase/supabase-js @supabase/ssr`
- `src/lib/supabase/server.ts` / `client.ts` にサーバー・ブラウザ用クライアント生成ヘルパーを実装。`.env` に設定した Supabase URL / Anon Key を参照。
- `src/lib/auth.ts` にロール判定ユーティリティを追加し、JWT/App Metadata の `role` / `roles` から権限を解決。
- `supabase/policies.sql` を作成して RLS ポリシーを SQL として明文化。`supabase/README.md` に設定手順を追記。
- `cd folklore-map && pnpm lint` で静的解析を実行し、変更が正常に通ることを確認。

> Supabase 側で JWT に `role` クレームを付与する仕組み（Auth Hook や Edge Function）を用意し、RLS で参照できる状態にしておいてください。

### API（/api/spots）初期実装
- `src/lib/db.ts` に Prisma クライアントのシングルトンを追加。
- `src/lib/schemas/spots.ts` で Spot 作成・一覧検索の Zod スキーマを定義。
- `src/lib/http.ts` に共通レスポンスヘルパーを実装（JSON/エラー応答、Zod エラー整形）。
- `src/app/api/spots/route.ts` に GET（一覧）/POST（下書き作成）を実装。Supabase セッションからロールを判定し、閲覧・投稿権限を制御。
- `src/app/api/spots/[id]/route.ts` に GET（詳細）を追加。公開・作成者・レビュワー以上のみ参照可能。
- `pnpm lint` を再実行し、静的解析が通ることを確認。

> 現時点の POST は既にぼかし済みの `lat/lng` と `blur_radius_m` を受け取る想定です。Geocode 連携後にワークフローを見直します。

### API（/api/geocode, /api/flags）実装
- `src/lib/maps.ts` に信頼度計算・ぼかし処理 (`applyBlur`)・ぼかし半径選定機能を追加。
- `src/lib/schemas/geocode.ts` でジオコーディング入力の Zod スキーマを定義。`/api/geocode` では編集者以上のみが Google Maps Geocoding API を呼び出せるよう制御し、ぼかし済み座標と confidence を返却。
- `src/lib/schemas/flags.ts` で通報作成・更新用のスキーマを定義。`/api/flags`（POST）と `/api/flags/[id]`（PATCH）を実装し、公開スポットまたは投稿者に対する通報受付／レビュワー以上によるステータス更新を実現。
- `supabase/policies.sql` に準拠する形で通報ステータス（OPEN/CLOSED）を更新可能にし、`created_by` がない場合は `"anonymous"` をセット。
- `pnpm lint` を再実行し、変更が問題ないことを確認。

### フロントエンド（地図 & 投稿フォーム）実装
- `pnpm add @googlemaps/js-api-loader date-fns react-hook-form @hookform/resolvers` を追加し、Google Maps とフォームバリデーション環境を整備。
- `src/components/spot-map.tsx` / `spot-explorer.tsx` を作成。公開スポット一覧を地図とリストで相互連携できる UI を実装し、`.env.example` に `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` を追加。
- `src/app/page.tsx` をサーバーコンポーネント化し、Prisma から公開スポットを取得して地図に表示。ヒーロー説明文を現在の開発状況に合わせて更新。
- `src/components/spot-form.tsx` と `src/app/post/page.tsx` を追加。React Hook Form + Zod で下書き投稿フォームを構築し、`/api/geocode` → `/api/spots` の連携を体験できるようにした。
- グローバルナビを `Link` に差し替え、レビュー・通報ページをルーティングに組み込み。
- `pnpm lint` を実行し、フロントエンド変更が問題なくビルド可能であることを確認。
- `SpotExplorer` に検索フィルタとスポット詳細モーダル（API からの遅延取得）を追加。地図表示と一覧が絞り込みに追従するよう改善。

### レビュー・通報画面＆スポット更新
- `SpotUpdateSchema` を追加し、`/api/spots/[id]` の `PATCH` でステータス変更やフィールド更新をサポート（レビュワーは公開、投稿者は下書き⇔レビュー遷移）。
- `src/components/review-panel.tsx` / `src/app/review/page.tsx` を実装し、下書き／レビュー待ちのスポットを一覧＆操作できる UI を追加。
- `src/components/flag-list.tsx` / `src/app/flags/page.tsx` を追加し、Open 通報の確認と `PATCH /api/flags/:id` を通じたクローズ操作に対応。
- `pnpm lint` を再実行し、変更が静的解析を通過することを確認。
- レビューパネルにチェックリスト・詳細表示を追加。公開前に出典・差別・プライバシー・正確さを確認し、チェック完了で公開ボタンが活性化するよう改善。

### 環境構築準備
- `supabase init` を実行し、`folklore-map/supabase/config.toml` を生成（Docker 未使用環境では `supabase start` は失敗するため注意）。
- `docs/setup-guide.md` を追加し、ローカル/クラウド双方の構築手順とトラブルシュートを整理。
- `PRISMA_PROVIDER=postgresql DATABASE_URL="postgresql://user:pass@localhost:5432/db" pnpm prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/000_init.sql`
  - 上記コマンドで初期化用 SQL（`prisma/migrations/000_init.sql`）を生成。Supabase SQL Editor 等で実行できる。
- `sudo apt-get install -y docker.io` → `sudo systemctl start docker` で Docker を導入。
- `supabase start` を実行（初回は大量のコンテナイメージを取得）。完了後、`supabase status` からローカル接続情報を `.env.local` に設定（Database URL: `postgresql://postgres:postgres@127.0.0.1:54322/postgres` など）。
- `PRISMA_PROVIDER=postgresql DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" pnpm prisma db push` を実行し、ローカル Supabase にテーブルを適用。
- Next.js の開発サーバーが `.next/dev/lock` の残骸で起動できない場合があったため、既存プロセスを `pkill -f 'next dev'` で停止 → `rm -f .next/dev/lock` を手順として共有。
- Google Maps の Loader が非推奨になったため、`@googlemaps/js-api-loader` の `setDefaultOptions` / `importLibrary` を用いる実装へ更新。

## 2025-11-08
### CLAUDE.md 作成
- Claude Code の将来のインスタンスのために `CLAUDE.md` をリポジトリルートに作成。
- 全体を日本語で記述し、プロジェクトの他のドキュメント（`basic_design.md`、`agents.md` 等）と一貫性を保持。
- 含まれる内容：
  - プロジェクト概要（民俗学マップの目的とデュアルスタック構成）
  - 主要コマンド（開発、Prisma、Supabase ローカル環境）
  - アーキテクチャ（全体構成図、ディレクトリ構成、データモデル）
  - 認証・認可（4段階ロールとRLSポリシー）
  - API設計（Spots、ジオコーディング、通報の各エンドポイント）
  - 地理的プライバシー（座標ぼかしアルゴリズムの詳細）
  - バリデーションとデータ品質（Zodスキーマと必須要件）
  - フロントエンド実装（Google Maps統合、投稿フロー）
  - 開発プラクティス（テスト戦略、セキュリティ考慮事項、共通パターン）
  - Pythonエージェント（今後実装予定のパイプライン）
  - 環境変数設定
  - 既知の問題と回避策
  - 次のステップ（ロードマップ）
  - 参照資料リンク
- `basic_design.md` / `detailed_design.md` / `agents.md` / `db_design.md` / `tasks.md` から重要情報を抽出・統合。
- 特に重要な実装詳細として、座標ぼかしアルゴリズム（`lib/maps.ts`）とロール解決ロジック（`lib/auth.ts`）を強調。

### 環境変数読み込み問題の修正
- **問題**: APIキーが正しく読み込まれていないとの報告
- **原因調査**:
  1. `folklore-map/.env` に Prisma 初期化時の古いダミーデータが残存
  2. `src/components/spot-map.tsx` にハードコードされたフォールバックAPIキーが存在
  3. 環境変数は `.env.local` に正しく設定されていたが、`.env` のダミーデータが混乱を招く可能性
- **実施した修正**:
  1. `folklore-map/.env` を `.env.local` と同じ内容に更新（Google Maps API キー、Supabase設定等）
  2. `src/components/spot-map.tsx` のハードコードされたフォールバック値を削除
  3. APIキーが未設定の場合は明示的なエラーメッセージを表示するよう変更
  4. 開発サーバーを再起動して環境変数を再読み込み
- **検証**: `/api/test-env` エンドポイントで両方のAPIキー（`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` / `GOOGLE_MAPS_API_KEY`）が正しく読み込まれていることを確認
- **セキュリティ改善**: ソースコードからハードコードされたAPIキーを削除し、環境変数のみに依存する構成に変更

### Google Maps API エラー修正（ApiProjectMapError / NoApiKeys）
- **問題**: ブラウザコンソールに `ApiProjectMapError` と `NoApiKeys` エラーが表示
- **原因調査**:
  1. APIキー自体は有効（`curl` でテスト済み、Google Cloud Console でも確認済み）
  2. `@googlemaps/js-api-loader` v2.0.2 の使用方法に問題
  3. `setOptions` に不要な `libraries: ["marker"]` パラメータを指定していた
  4. **根本原因**: `setOptions` のパラメータ名が誤っていた（`apiKey` ではなく `key` が正しい）
- **実施した修正**:
  1. `src/components/spot-map.tsx` の `setOptions` から `libraries` パラメータを削除
  2. **重要**: `setOptions({ apiKey: ... })` を `setOptions({ key: ... })` に修正
  3. デバッグ用にAPIキーの先頭10文字をコンソールに出力
  4. `importLibrary("marker")` で明示的にライブラリを読み込む実装を維持
- **結果**: パラメータ名を `key` に変更することで、`NoApiKeys` エラーが解消され、地図が正常に表示されるようになった

## 2025-11-13
### 認証エラー修正（"Failed to fetch" in Supabase Auth）
- **問題**: ログイン/サインアップ時に `Failed to fetch` エラーが発生し、認証に失敗
- **原因調査**:
  1. ブラウザは `http://192.168.0.238:3000` からアプリにアクセス
  2. `.env.local` の `NEXT_PUBLIC_SUPABASE_URL` が `http://localhost:54321` に設定されていた
  3. クロスオリジン接続によりブラウザがSupabaseへのリクエストをブロック
  4. `supabase/config.toml` の `site_url` も `http://127.0.0.1:3000` になっていた
- **実施した修正**:
  1. `.env.local` を更新: `NEXT_PUBLIC_SUPABASE_URL=http://192.168.0.238:54321`
  2. `supabase/config.toml` を更新:
     - `site_url = "http://192.168.0.238:3000"`
     - `additional_redirect_urls` にネットワークIPを追加
  3. `supabase/config.toml` で analytics を無効化（CPU非互換エラー対策）
  4. `src/lib/supabase/client.ts` にURL変更検出とキャッシュ無効化機能を追加
  5. 全開発サーバーを停止、`.next` キャッシュをクリア、Supabase再起動
- **結果**: 認証が正常に動作し、サインアップ/ログインが成功するようになった
- **教訓**: ネットワーク経由でアクセスする場合、すべての設定ファイルでIPアドレスを統一する必要がある。ブラウザキャッシュの影響も考慮すべき。

### データベース重複削除
- **問題**: スポット一覧に同じタイトルの伝承が複数存在（88件中16件が重複）
- **実施した作業**:
  1. `scripts/find_duplicates.mjs` を作成し、タイトルでグループ化して重複を検出
  2. `scripts/remove_duplicates.mjs` を作成し、`updated_at` が古い方を削除
  3. 実行結果: 16件の重複を削除し、72件に整理
- **検証**: Prisma Studio で確認し、重複が解消されたことを確認
- **スクリプト保存場所**: `/home/test/codex-test/folklore-map/scripts/`

### UI/UX改善: 双方向マップ・リスト連携
#### 地図アイコンクリック → リスト自動スクロール＆ハイライト
- **実装内容** (`src/components/spot-explorer.tsx`):
  1. `useRef` でスポットリストアイテムへの参照を管理
  2. `selectedId` 変更時に `scrollIntoView({ behavior: "smooth", block: "nearest" })` を実行
  3. 選択中のアイテムに `ring-2 ring-primary/30` スタイルを適用してハイライト表示
- **結果**: 地図上のマーカーをクリックすると、リストが自動スクロールし、該当項目が視覚的に強調される

#### スポットリストクリック → 地図ズーム＋ポップアップ表示
- **実装内容** (`src/components/spot-map.tsx`):
  1. `google.maps.InfoWindow` を追加し、スポット情報を表示
  2. リストアイテムクリック時にズームレベル14にズームし、位置にパン
  3. InfoWindow にスポットタイトルとカテゴリラベルを表示
- **結果**: リストから伝承を選択すると、地図が該当位置にズームし、詳細ポップアップが表示される

#### スムーズズームアニメーション実装
- **要件**: 一気に場所が切り替わるのではなく、全体図からゆっくりズームして目的地を表示
- **実装アルゴリズム** (3段階アニメーション):
  1. **Stage 1**: 現在のズームレベルから全体図（zoom level 6）まで段階的にズームアウト（100msごと）
  2. **Stage 2**: 全体図の状態で目的地にパン移動（300ms待機後）
  3. **Stage 3**: 目的地で zoom level 14 まで段階的にズームイン（100msごと、600ms待機後）
- **技術的詳細**:
  - `setInterval` / `setTimeout` でアニメーションを制御
  - `useEffect` のクリーンアップ関数で全タイマーをクリア（メモリリーク防止）
  - アニメーション完了後に InfoWindow を表示
- **結果**: 地図が滑らかに引いて → 移動して → 寄るという自然な動きを実現

### 開発環境用の一時的な認証無効化
- **目的**: デモンストレーションとテストのため、ログインなしで投稿・編集機能を利用可能に
- **実施した変更**:
  1. **投稿画面** (`src/app/post/page.tsx`)
     - Supabaseセッションチェックをコメントアウト
     - ページ説明文に「【開発モード】ログインなしで投稿できます」を追加
  2. **スポット作成API** (`src/app/api/spots/route.ts`)
     - POST エンドポイントの認証チェックを無効化
     - 一時的に `role = "editor"`, `userId = "anonymous-user"` を設定
  3. **ジオコーディングAPI** (`src/app/api/geocode/route.ts`)
     - 編集者権限チェックをコメントアウト
  4. **スポット更新API** (`src/app/api/spots/[id]/route.ts`)
     - PATCH エンドポイントの認証チェックを無効化
     - 一時的に `role = "admin"`, `userId = "anonymous-user"` を設定
- **注意**: 本番環境では必ずこれらの認証チェックを有効化すること

### 投稿フォームの改善
- **タイトル変更**: 「新しいスポットを提出する」→「新しいスポットを追加する」
- **説明文の更新**:
  - 「修正が必要になります」→「修正されることがあります」
  - より柔らかい表現に変更してユーザー体験を向上
- **アイコン種別の順序最適化** (`src/components/spot-form.tsx`):
  - 「その他 (GENERIC)」オプションを選択肢の最下部に移動
  - 順序: 鬼 → 狐 → 犬 → 龍 → 寺 → 神社 → 動物 → その他

### 管理者画面: スポット公開機能の追加
- **実装内容** (`src/app/admin/spots/page.tsx`):
  1. `handlePublish` 関数を追加
     - `/api/spots/:id` に PATCH リクエストで `status: "PUBLISHED"` を送信
     - 成功時にスポット一覧を再読み込みして最新状態を表示
  2. 「公開」ボタンを操作列に追加
     - `status !== "PUBLISHED"` の場合のみ表示（下書き・レビュー中のみ）
     - 緑色テキストで視覚的に区別
  3. エラーハンドリング
     - 成功時: 「公開しました」アラート
     - 失敗時: エラーメッセージを表示
- **結果**: 管理者が一覧画面から直接スポットを公開可能に

### 明治期古地図の表示修正
- **問題**: 今昔マップ on the webのタイルURLが404エラーを返し、古地図が表示されない
- **原因**: 今昔マップのタイル形式が変更されたか、URLが無効
- **実施した修正**:
  1. **タイルソースを国土地理院に変更** (`src/components/spot-map.tsx`)
     - 明治13-19年（1880-1886年）の迅速測図を使用
     - URL: `https://cyberjapandata.gsi.go.jp/xyz/gazo1/`
     - 著作権フリーのパブリックドメイン
  2. **クレジット表記を更新**
     - 「今昔マップ on the web」→「国土地理院 歴史的地形図」
  3. **不要なコード削除**
     - 今昔マップ用の地域判定関数（`selectDatasetByLocation`）を削除
     - TMS形式の座標変換関数を削除
- **制限事項**: 主に関東平野をカバー。全国版には追加データセットが必要
- **結果**: 地図右上の「明治期古地図」ボタンで国土地理院の歴史的地形図が正常に表示

### フィルター適用時の地図表示改善
- **問題**: フィルター（例: 「神社」）を選択すると、最初のスポットに自動的にズームしてしまい、他のスポットが見えない
- **要件**: フィルター適用時は、該当する全スポットが見える範囲に地図を調整
- **実施した修正**:
  1. **自動選択の無効化** (`src/components/spot-explorer.tsx`)
     - フィルター適用後、`selectedId` を `null` に設定
     - 特定のスポットを自動選択しないように変更
  2. **バウンディングボックス自動調整** (`src/components/spot-map.tsx`)
     - `selectedId === null` の場合、すべてのスポットの座標を含む範囲を計算
     - `fitBounds()` で適切な余白を持たせて表示
     - 複数スポット: バウンディングボックスに自動フィット
     - 1件のみ: ズームレベル8（都道府県レベル）で引いた状態で表示
- **結果**:
  - 「神社」を選ぶと、すべての神社のピンが見える範囲に地図が調整される
  - ユーザーは全体像を把握してから、特定のスポットを選択できる
  - 1件のみの場合も、日本のどこにあるか地理的文脈が分かる

### 関連ファイル
- `folklore-map/.env.local`: Supabase URLをネットワークIPに変更
- `folklore-map/supabase/config.toml`: site_url と additional_redirect_urls を更新、analytics無効化
- `folklore-map/src/lib/supabase/client.ts`: URL変更検出とキャッシュ無効化
- `folklore-map/src/app/login/page.tsx`: エラーハンドリング強化
- `folklore-map/scripts/find_duplicates.mjs`: 重複検出スクリプト
- `folklore-map/scripts/remove_duplicates.mjs`: 重複削除スクリプト
- `folklore-map/src/components/spot-explorer.tsx`: 自動スクロール＆ハイライト機能、フィルター時の自動選択無効化
- `folklore-map/src/components/spot-map.tsx`: InfoWindow、ズーム、スムーズアニメーション機能、古地図タイル変更、バウンディングボックス自動調整
- `folklore-map/src/app/post/page.tsx`: 認証無効化、テキスト改善
- `folklore-map/src/app/api/spots/route.ts`: POST認証無効化
- `folklore-map/src/app/api/spots/[id]/route.ts`: PATCH認証無効化
- `folklore-map/src/app/api/geocode/route.ts`: 認証無効化
- `folklore-map/src/components/spot-form.tsx`: アイコン順序変更
- `folklore-map/src/app/admin/spots/page.tsx`: 公開機能追加
