# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際にClaude Code (claude.ai/code) へのガイダンスを提供します。

## プロジェクト概要

**民俗学マップ** — 日本の民俗学、伝説、歴史的な言い伝えをGoogle Maps上にマッピングするNext.jsアプリケーションです。Sechack365プロジェクトとして、地理的プライバシー保護と倫理的なコンテンツモデレーションを備えた「民俗学版・大島てる」を目指しています。

デュアルスタック構成:
- **Node.js/TypeScript (Next.js)** でWebアプリケーションとAPI
- **Python** でAI駆動のコンテンツ処理エージェント（収集、整理、倫理チェック）

## 主要コマンド

### 開発
```bash
cd folklore-map
pnpm install              # 依存関係のインストール
pnpm dev                  # 開発サーバー起動 (http://localhost:3000)
pnpm build                # 本番ビルド
pnpm start                # 本番ビルドの実行
pnpm lint                 # ESLintの実行
```

### データベース (Prisma)
```bash
cd folklore-map
pnpm prisma:generate      # Prismaクライアント生成
pnpm prisma:migrate       # データベースマイグレーション
pnpm prisma:studio        # Prisma Studio GUI起動
pnpm prisma db push       # スキーマをデータベースにプッシュ（開発用）
```

**重要**: Prismaプロバイダーは PostgreSQL 用に設定されています。Supabaseローカル開発の場合:
```bash
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" pnpm prisma db push
```

### Supabase ローカル開発
```bash
supabase start            # ローカルSupabase起動（Docker必須）
supabase status           # 接続情報の取得
supabase stop             # ローカルインスタンス停止
```

**トラブルシューティング**: Next.jsがロックエラーで起動しない場合:
```bash
pkill -f 'next dev'
rm -f folklore-map/.next/dev/lock
```

## アーキテクチャ

### 全体構成

```
┌─────────────────────────────────────────────────────────┐
│  Next.js App (folklore-map/)                            │
│  ├─ フロント: React 19 + TypeScript + Tailwind         │
│  ├─ バックエンド: Route Handlers (/api/*)              │
│  └─ データベース: Prisma → Supabase PostgreSQL         │
└─────────────────────────────────────────────────────────┘
         ↓ (今後実装)
┌─────────────────────────────────────────────────────────┐
│  Python エージェント (python/)                          │
│  ├─ harvester.py      - コンテンツ収集                 │
│  ├─ curator.py        - 要約・重複排除                  │
│  ├─ ethics_gate.py    - 安全性・差別チェック           │
│  └─ icon_tagger.py    - カテゴリ分類                    │
└─────────────────────────────────────────────────────────┘
```

### ディレクトリ構成

**Next.js App** (`folklore-map/`):
```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # トップページ: 地図ビュー＋スポット一覧
│   ├── post/page.tsx             # 投稿フォーム (editor以上)
│   ├── review/page.tsx           # レビューパネル (reviewer以上)
│   ├── flags/page.tsx            # 通報モデレーション (reviewer以上)
│   └── api/
│       ├── spots/route.ts        # GET (一覧), POST (下書き作成)
│       ├── spots/[id]/route.ts   # GET (詳細), PATCH (更新), DELETE
│       ├── geocode/route.ts      # POST: 住所 → 緯度経度（ぼかし付き）
│       ├── flags/route.ts        # POST: 通報作成
│       └── flags/[id]/route.ts   # PATCH: 通報ステータス更新
├── components/
│   ├── spot-map.tsx              # Google Maps統合
│   ├── spot-explorer.tsx         # 地図＋リスト＋検索UI
│   ├── spot-form.tsx             # 投稿フォーム（バリデーション付き）
│   ├── review-panel.tsx          # レビューインターフェース（チェックリスト付き）
│   └── flag-list.tsx             # 通報モデレーションUI
├── lib/
│   ├── auth.ts                   # ロール解決 (viewer/editor/reviewer/admin)
│   ├── db.ts                     # Prismaクライアント（シングルトン）
│   ├── http.ts                   # HTTPレスポンスヘルパー
│   ├── maps.ts                   # ジオコーディング信頼度＆ぼかしアルゴリズム
│   ├── schemas/                  # Zodバリデーションスキーマ
│   │   ├── spots.ts
│   │   ├── geocode.ts
│   │   └── flags.ts
│   └── supabase/
│       ├── server.ts             # サーバーサイドSupabaseクライアント
│       └── client.ts             # ブラウザサイドSupabaseクライアント
└── prisma/
    └── schema.prisma             # データベーススキーマ
```

**ルート設計ドキュメント**:
- `basic_design.md` / `detailed_design.md`: システムアーキテクチャと仕様
- `db_design.md`: データベーススキーマドキュメント
- `agents.md`: Pythonエージェント設計とワークフロー
- `setup.md`: セットアップ履歴とトラブルシューティング
- `tasks.md`: 開発タスク管理

### データモデル

**主要エンティティ** (`prisma/schema.prisma` 参照):

1. **Spot** — 民俗学的地点・物語
   - 地理データ: `lat`, `lng`
   - コンテンツ: `title`, `description`, `icon_type` (ONI/KITSUNE/DOG/DRAGON/TEMPLE/SHRINE/ANIMAL/GENERIC)
   - ワークフロー: `status` (DRAFT → REVIEW → PUBLISHED)

2. **Source** — 出典（Spotごとに1件以上必須）
   - タイプ: URL, BOOK, INTERVIEW
   - フィールド: `citation`, `url` (URL型の場合必須)

3. **Flag** — 不適切なコンテンツの通報
   - 理由: INAPPROPRIATE, WRONG_INFO, DISCRIMINATION, PRIVACY
   - ステータス: OPEN → CLOSED (reviewer以上のみ)

4. **Audit** — 操作履歴ログ
   - 誰がいつ何をしたかを記録

### 認証と認可

**ロール** (`lib/auth.ts` とSupabase RLSで実施):
- **viewer**: 公開スポットの閲覧のみ
- **editor**: 自分の下書き作成・編集、レビュー申請
- **reviewer**: 投稿の承認・却下、通報対応、スポット公開
- **admin**: 全権限

**ロール解決**:
- ロールはSupabase JWTクレーム（`app_metadata.role` または `app_metadata.roles`）に格納
- `getUserRole()` がセッション/ユーザーから最高優先度のロールを抽出
- `hasRole(required, current)` が現在のロールが必要レベルを満たすか判定

**RLSポリシー** (`supabase/policies.sql`):
- 公開: `status='PUBLISHED'` のスポットを誰でも読める
- 編集者: 自分の `DRAFT`/`REVIEW` スポットを読み書き可能
- レビュワー: 全スポット読み書き、通報管理可能

### API設計

全APIはREST規約に従いJSON形式でレスポンス。エラーは `{error: {code, message}}` 形式。

**Spots** (`/api/spots`):
- `GET`: スポット一覧（クエリ: `bbox`, `q`, `tags`, `era`, `status`）
- `POST` (editor以上): `/api/geocode` 経由でジオコーディングし下書き作成
- `GET /api/spots/:id`: 単一スポット取得（status/所有者を考慮）
- `PATCH /api/spots/:id` (editor以上): スポット更新; ステータス変更はreviewer以上
- `DELETE /api/spots/:id` (admin): 物理削除

**ジオコーディング** (`/api/geocode`):
- `POST` (editor以上): 住所 → `{lat, lng}`
- Google Maps Geocoding API使用
- レート制限: 30 req/min/IP

**通報** (`/api/flags`):
- `POST` (公開): 理由＋メモでスポットを通報
- `PATCH /api/flags/:id` (reviewer以上): 通報ステータス更新、コメント追加

### バリデーションとデータ品質

**Zodスキーマ** (`lib/schemas/*.ts`):
- `SpotCreateSchema`: 必須フィールド強制（title 2-80文字、description ≤3000文字、出典1件以上）
- `GeocodeSchema`: ジオコーディングリクエストのアドレス検証
- `FlagCreateSchema`: 通報送信の検証

**コンテンツ要件**:
- **出典は必須**: すべてのスポットは適切な引用を含む出典を1件以上持つ必要がある
- **倫理**: 差別、プライバシー侵害、虚偽情報はレビューワークフローでフィルタリング

### フロントエンド実装

**Google Maps統合** (`components/spot-map.tsx`):
- `@googlemaps/js-api-loader` のモダンな `importLibrary()` API使用
- 環境変数: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `icon_type` ごとのカスタムマーカー（アクセシビリティラベル付き）
- 今後: 古地図オーバーレイを `GroundOverlay` または `ImageMapType` で実装予定

**Spot Explorer** (`components/spot-explorer.tsx`):
- 地図＋リストビューの双方向連携
- キーワード、タグ、時代、ステータスで検索・フィルタ
- API経由の遅延ロード付き詳細モーダル

**投稿フロー**:
1. editorが `spot-form.tsx` で住所、タイトル、説明、出典を入力
2. フォームが `/api/geocode` を呼んで座標取得
3. `/api/spots` にDRAFTとして送信
4. reviewerが `review-panel.tsx` でチェックリスト確認:
   - 出典が検証済み
   - 差別・偏見なし
   - プライバシー尊重
   - 正確性確認
5. 承認時: status → PUBLISHED、地図に表示

## 開発プラクティス

### Claude Code サブエージェント活用ルール

**基本方針**: すべての開発タスクでClaude Codeのサブエージェント機能を最大限活用し、効率的な分散並列開発を実施する。

**1. Task Toolの積極的活用**
- 複数ファイルにまたがる実装は `Task` tool（`subagent_type: "general-purpose"`）を使用
- コードベース探索は `Task` tool（`subagent_type: "Explore"`）を使用
- 並列実行可能なタスクは**必ず同時に複数のTask toolを起動**（例: 複数コンポーネントの実装、複数APIエンドポイントの作成）

**2. Definition of Done (DoD)**

各フェーズ完了時に以下を必ず実施:

**Phase完了チェックリスト**:
1. ✅ **コードレビュー実施**
   - サブエージェントを使ってコード品質チェック
   - セキュリティ脆弱性の確認
   - ベストプラクティス遵守の確認

2. ✅ **プロダクションビルド検証**
   ```bash
   cd folklore-map
   pnpm build
   ```
   - ビルドエラーがないこと
   - TypeScriptの型エラーがないこと
   - ESLint警告がないこと

3. ✅ **動作確認**
   - 実装した機能が正常に動作すること
   - 既存機能に影響がないこと

**3. 並列開発戦略**

- 独立したコンポーネント/API/機能は**並列にサブエージェントを起動**して同時開発
- 依存関係があるタスクのみ順次実行
- 単一メッセージで複数Task toolを呼び出すことで最大効率化

**4. フェーズ管理**

各フェーズ（tasks.mdのT01-T11）完了時:
1. 上記DoDチェックリスト実施
2. `tasks.md` の状態更新
3. 次フェーズの計画立案

### テスト戦略
テスト実装時（tasks.mdのT09）:
- ユニットテスト: Zodスキーマ、ロール解決（`lib/auth.ts`）
- API統合テスト: 全エンドポイントを異なるロール権限でテスト
- E2Eテスト: 地図描画、投稿 → レビュー → 公開ワークフロー
- 倫理テスト: NGワード検出の検証（ethics_gate.py実装時）

### セキュリティ考慮事項
- **全入力を検証**: Zodスキーマを一貫して使用
- **RLSを尊重**: データベースポリシーが行レベルアクセス制御を実施
- **レート制限**: ジオコーディングAPIは30 req/min制限
- **CSPヘッダー**: スクリプトソースを制限（Google Mapsのみ）
- **ログにPIIなし**: ユーザーデータのログ記録を避ける

### 共通パターン

**APIエンドポイントの作成**:
1. `lib/schemas/` でZodスキーマを定義
2. `app/api/*/route.ts` でルートハンドラー作成
3. Supabaseセッション経由で認証確認
4. `getUserRole()` と `hasRole()` でロール検証
5. Zodスキーマで入力検証
6. `lib/db.ts` のPrismaクライアント使用
7. `lib/http.ts` ヘルパー経由でJSON返却

**新しいロールゲート機能の追加**:
1. `supabase/policies.sql` のRLSポリシーを更新
2. APIハンドラーで `hasRole()` を使ってロール確認
3. フロントエンドでユーザーロールに基づきUI条件表示

### Pythonエージェント（今後実装）

**エージェントパイプライン** (`agents.md` 参照):
```
Harvester → Curator → Ethics Gate → Geocoder → Icon Tagger → Publisher
```

Pythonエージェント実装時（tasks.mdのT07）:
- エージェントは**ステートレス**かつ**CLI対応**に（入出力はJSONL経由）
- AI操作には**明示的なプロンプト**使用（`agents.md` §7参照）
- Ethics Gateは必須: 差別、PII、虚偽主張をフラグ
- 出力形式: Prismaスキーマに合致するフィールドを持つJSONL

**実行パターン**（予定）:
```bash
python python/harvester.py --input urls.txt --output tmp/harvest.jsonl
python python/curator.py --in tmp/harvest.jsonl --out tmp/curated.jsonl
python python/ethics_gate.py --in tmp/curated.jsonl --out tmp/safe.jsonl
# ... その後 tmp/safe.jsonl を /api/spots 経由でインポート
```

## 環境変数

`.env.local` に必要（`.env.example` 参照）:
```bash
# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
GOOGLE_MAPS_API_KEY=your_api_key_here  # サーバーサイドジオコーディング用

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...  # 管理操作のみ

# Database
DATABASE_URL=postgresql://postgres:password@localhost:54322/postgres

# Site
NEXT_PUBLIC_SITE_NAME=民俗学マップ
```

## 既知の問題と回避策

1. **Next.js 16 vs 15**: プロジェクトはNext.js 16 + React 19使用（`create-next-app`最新版）。要件ではNext.js 15 + React 18を想定。互換性問題に注意。

2. **ロックファイル競合**: `pnpm dev` がロックエラーで失敗する場合:
   ```bash
   pkill -f 'next dev' && rm -f folklore-map/.next/dev/lock
   ```

3. **Prismaプロバイダー切替**: `schema.prisma` はPostgreSQLにハードコード。SQLiteの場合は手動で `datasource.provider` 変更が必要。

4. **SupabaseローカルにはDocker必須**: Dockerなしの場合はクラウドSupabaseインスタンス使用またはローカルテストをスキップ。

5. **Google Maps非推奨対応**: モダンな `@googlemaps/js-api-loader` の `importLibrary()` 使用。非推奨の `google.maps.Loader` は避ける。

## 次のステップ（ロードマップ）

詳細は `tasks.md` 参照。主な未着手項目:

- **T07**: Pythonエージェント実装（harvester、curator、ethics gate、icon tagger）
- **T08**: セキュリティ強化（CSPヘッダー、入力サニタイゼーション、画像のEXIF削除）
- **T09**: テストスイート（ユニット、統合、E2E）＋GitHub Actions CI/CD
- **T10**: 本番デプロイ（Vercel + Supabaseクラウド）
- **T11**: ドキュメント整備とプレゼンテーション資料

## 参照資料

- 主要設計ドキュメント: `basic_design.md`, `detailed_design.md`
- API仕様: `api_design.md`
- データベース: `db_design.md`, `prisma/schema.prisma`
- セットアップ履歴: `setup.md`
- Pythonエージェント: `agents.md`
- タスク管理: `tasks.md`
