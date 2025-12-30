# 🗺️ 民俗学マップ

日本の民俗学、伝説、歴史的な言い伝えをGoogle Maps上にマッピングするWebアプリケーションです。

**Sechack365プロジェクト** として開発された、地理的プライバシー保護と倫理的なコンテンツモデレーションを備えた「民俗学版・大島てる」を目指したプラットフォームです。

---

## ✨ 主な機能

### 🗺️ インタラクティブ地図表示
- **Google Maps統合**: 日本全国の民俗学スポットを地図上に表示
- **カスタムマーカー**: 絵文字アイコン（👹鬼、🦊狐、🐉龍、⛩️神社など）
- **今昔マップ比較**: 明治時代の古地図と現代地図の切り替え表示

### 🔍 高度検索機能
- **タグフィルタ**: icon_type（鬼、狐、龍、神社、寺院など）で絞り込み
- **時代フィルタ**: 平安時代、江戸時代など時代別に検索
- **キーワード検索**: タイトルと説明文の全文検索
- **地図範囲フィルタ**: 表示中のエリア内のスポットのみ表示
- **URL状態管理**: 検索条件をURLに保存（ブックマーク・共有可能）

### 📝 投稿・レビューワークフロー
- **3段階ステータス**: DRAFT（下書き） → REVIEW（レビュー中） → PUBLISHED（公開）
- **出典必須**: すべてのスポットに信頼できる出典情報（URL/書籍/インタビュー）を要求
- **チェックリスト付きレビュー**: 出典確認、差別チェック、プライバシー確認、正確性検証
- **変更履歴差分表示**: 編集内容を視覚的に比較（赤＝変更前、緑＝変更後）

### 🚩 通報・モデレーション
- **通報機能**: 不適切なコンテンツ、誤情報、差別、プライバシー侵害を通報
- **通報管理**: レビュワーが通報を確認・処理

### 👥 権限管理
- **viewer**: 公開スポットの閲覧のみ
- **editor**: 下書き作成・編集、レビュー申請
- **reviewer**: 投稿の承認・却下、通報対応
- **admin**: 全権限（スポット削除、統計確認）

### 📊 管理者サイト
- **ダッシュボード**: システム全体の統計（スポット数、通報数、ステータス分布）
- **スポット管理**: 検索、フィルタ、一括削除
- **通報管理**: フィルタ、詳細表示、処理

---

## 🚀 デモ

**現在のデータ**: 日本全国の民俗学伝承 **104件**

- 北海道・東北: 15件（義経北行伝説、アイヌコタン、恐山、なまはげなど）
- 関東: 15件（平将門の首塚、浅草寺、鎌倉大仏など）
- 中部: 20件（善光寺、諏訪大社、富士講、白川郷など）
- 関西: 10件（清水寺、伏見稲荷、金閣寺、東大寺など）
- 中国: 8件（鳥取砂丘、出雲大社、厳島神社など）
- 四国: 8件（四国八十八ヶ所、祖谷のかずら橋など）
- 九州・沖縄: 18件（博多祇園山笠、太宰府、阿蘇山、首里城など）

---

## 🛠️ 技術スタック

### フロントエンド
- **Next.js 16** (App Router)
- **React 19**
- **TypeScript 5**
- **Tailwind CSS 4**
- **shadcn/ui** (UIコンポーネント)
- **Google Maps JavaScript API**

### バックエンド
- **Next.js API Routes** (Route Handlers)
- **Prisma** (ORMと)
- **PostgreSQL** (Supabase)
- **Supabase Auth** (認証)

### 開発ツール
- **Vitest** (ユニットテスト)
- **ESLint** (Linter)
- **pnpm** (パッケージマネージャー)
- **GitHub Actions** (CI/CD)

---

## 📦 セットアップ

### 前提条件

- Node.js 20.x
- pnpm 10.x
- Docker (Supabaseローカル開発用)
- Google Maps API キー

### 1. リポジトリのクローン

```bash
git clone https://github.com/YOUR-USERNAME/folklore-map.git
cd folklore-map
```

### 2. 依存関係のインストール

```bash
cd folklore-map
pnpm install
```

### 3. 環境変数の設定

`.env.local` を作成：

```bash
cp .env.example .env.local
```

以下の環境変数を設定：

```env
# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
GOOGLE_MAPS_API_KEY=your_api_key_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Database
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

### 4. Supabaseローカル環境の起動

```bash
supabase start
```

### 5. データベースのセットアップ

```bash
# Prismaスキーマをプッシュ
pnpm prisma db push

# サンプルデータをインポート
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" pnpm tsx scripts/seed-data-100.ts
```

### 6. 開発サーバーの起動

```bash
pnpm dev
```

ブラウザで http://localhost:3000 を開く。

---

## 🧪 テスト

```bash
# ユニットテストを実行
pnpm test

# テストカバレッジを確認
pnpm test:coverage

# Lintを実行
pnpm lint

# 型チェック
pnpm tsc --noEmit
```

---

## 📚 ドキュメント

- **[CLAUDE.md](CLAUDE.md)**: プロジェクト概要とClaude Code向けガイダンス
- **[DEPLOYMENT.md](DEPLOYMENT.md)**: デプロイ手順（Vercel + Supabase）
- **[tasks.md](tasks.md)**: 開発タスク管理
- **[folklore-map/docs/development-log.md](folklore-map/docs/development-log.md)**: 開発履歴
- **[folklore-map/docs/admin-site-guide.md](folklore-map/docs/admin-site-guide.md)**: 管理者サイト使い方
- **[folklore-map/docs/security-checklist.md](folklore-map/docs/security-checklist.md)**: セキュリティチェックリスト

---

## 🏗️ プロジェクト構成

```
folklore-map/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── page.tsx              # トップページ（地図＋スポット一覧）
│   │   ├── post/page.tsx         # 投稿フォーム
│   │   ├── review/page.tsx       # レビューパネル
│   │   ├── flags/page.tsx        # 通報一覧
│   │   ├── admin/                # 管理者サイト
│   │   └── api/                  # API Routes
│   ├── components/               # Reactコンポーネント
│   │   ├── spot-map.tsx          # Google Maps統合
│   │   ├── spot-explorer.tsx     # 検索・フィルタUI
│   │   ├── spot-form.tsx         # 投稿フォーム
│   │   ├── review-panel.tsx      # レビューインターフェース
│   │   └── history-diff.tsx      # 変更履歴差分表示
│   ├── lib/                      # ユーティリティ
│   │   ├── auth.ts               # 認証・権限管理
│   │   ├── db.ts                 # Prismaクライアント
│   │   ├── sanitize.ts           # 入力サニタイゼーション
│   │   └── schemas/              # Zodバリデーションスキーマ
│   └── __tests__/                # テスト
├── prisma/
│   └── schema.prisma             # データベーススキーマ
├── scripts/                      # データインポートスクリプト
└── docs/                         # ドキュメント
```

---

## 🔐 セキュリティ

- **CSPヘッダー**: スクリプトソースを制限
- **入力サニタイゼーション**: XSS攻撃を防止
- **RLS (Row Level Security)**: データベースレベルのアクセス制御
- **レート制限**: ジオコーディングAPI 30 req/min
- **出典必須**: デマ・虚偽情報の防止

詳細は [folklore-map/docs/security-checklist.md](folklore-map/docs/security-checklist.md) を参照。

---

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. Pull Requestを作成

---

## 📄 ライセンス

MIT License

---

## 👨‍💻 開発者

**Sechack365プロジェクト** として開発

---

## 🙏 謝辞

- **今昔マップ on the web** (https://ktgis.net/kjmapw/) - 古地図タイルデータの提供
- **Google Maps Platform** - 地図表示とジオコーディングAPI
- **Supabase** - 認証とデータベースホスティング
- **Vercel** - ホスティングプラットフォーム

---

**最終更新**: 2025-11-12
