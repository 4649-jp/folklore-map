# 管理者分析機能

## 概要

管理者向けダッシュボードにユーザー行動とコンテンツのパフォーマンスを追跡・分析するための機能を実装しました。この機能により、reviewerとadminロールのユーザーは以下の情報にアクセスできます：

1. **スポット追加履歴** - スポットの投稿動向の把握
2. **検索ログ集計** - ユーザーの検索行動とニーズの分析
3. **コンテンツ人気指標** - 各スポットのエンゲージメント測定

すべてのデータは期間フィルタリングとCSVエクスポートに対応しています。

## アクセス方法

- **URL**: `/admin/analytics`
- **必要な権限**: reviewer以上（hasRole("reviewer", role) でチェック）
- **認証**: Supabase Auth + ロールベースアクセス制御

## データベーススキーマ

### 新規モデル

#### 1. SearchLog（検索ログ）

ユーザーの検索行動を記録します。

```prisma
model SearchLog {
  id             String   @id @default(cuid())
  keyword        String?   // 検索キーワード
  icon_types     String?   // フィルタしたアイコンタイプ（JSON文字列）
  era            String?   // 時代フィルタ
  status         String?   // ステータスフィルタ
  user_id        String?   // ログインユーザーのID
  session_id     String?   // セッションID（未ログインユーザー追跡用）
  results_count  Int       @default(0)  // 検索結果件数
  searched_at    DateTime  @default(now())  // 検索日時

  @@index([searched_at])
  @@index([keyword])
}
```

**用途**:
- 人気検索キーワードのランキング
- 使用頻度の高いフィルタの特定
- 検索結果が0件のクエリの発見（UX改善のため）

#### 2. SpotView（スポット閲覧履歴）

スポット詳細ページの閲覧を記録します。

```prisma
model SpotView {
  id          String   @id @default(cuid())
  spot_id     String   // 閲覧されたスポットのID
  user_id     String?  // ログインユーザーのID
  session_id  String?  // セッションID
  duration_ms Int?     // ページ滞在時間（ミリ秒）
  viewed_at   DateTime @default(now())  // 閲覧日時
  spot        Spot     @relation(fields: [spot_id], references: [id], onDelete: Cascade)

  @@index([spot_id])
  @@index([viewed_at])
}
```

**用途**:
- スポットごとの閲覧数カウント
- 平均滞在時間の計算（エンゲージメント指標）
- 閲覧トレンドの時系列分析

#### 3. SpotInteraction（スポットインタラクション）

いいね、保存、シェアなどのユーザーアクションを記録します。

```prisma
model SpotInteraction {
  id            String           @id @default(cuid())
  spot_id       String
  user_id       String?
  session_id    String?
  type          InteractionType  // LIKE | SAVE | SHARE
  created_at    DateTime         @default(now())
  spot          Spot             @relation(fields: [spot_id], references: [id], onDelete: Cascade)

  @@index([spot_id])
  @@index([type])
  @@index([created_at])
}

enum InteractionType {
  LIKE   // いいね
  SAVE   // 保存（ブックマーク）
  SHARE  // シェア
}
```

**用途**:
- 人気コンテンツの特定
- インタラクションタイプ別の集計
- ユーザーエンゲージメントのトレンド分析

### 既存モデルの変更

#### Spot モデル

分析用に `created_at` フィールドを追加しました。

```prisma
model Spot {
  id            String            @id @default(cuid())
  // ... 既存フィールド
  created_at    DateTime          @default(now())  // 追加
  updated_at    DateTime          @updatedAt

  // リレーション追加
  views         SpotView[]
  interactions  SpotInteraction[]

  @@index([created_at])  // 新しいインデックス
}
```

## API エンドポイント

すべてのエンドポイントは reviewer以上の権限が必要です。

### 1. スポット追加履歴

**GET** `/api/admin/analytics/spot-history`

スポットの投稿履歴を取得します。

**クエリパラメータ**:
- `start_date` (optional): ISO 8601形式の開始日（例: `2025-01-01`）
- `end_date` (optional): ISO 8601形式の終了日
- `limit` (optional): 取得件数（デフォルト: 100）
- `offset` (optional): オフセット（ページング用、デフォルト: 0）

**レスポンス** (200 OK):
```json
{
  "data": {
    "spots": [
      {
        "id": "clx...",
        "title": "酒呑童子の伝説",
        "created_by": "user_abc123",
        "created_at": "2025-11-23T10:30:00.000Z",
        "status": "PUBLISHED",
        "icon_type": "ONI"
      }
    ],
    "total": 150,
    "limit": 100,
    "offset": 0
  }
}
```

**使用例**:
```bash
# 2025年11月のスポットのみ取得
curl "http://localhost:3000/api/admin/analytics/spot-history?start_date=2025-11-01&end_date=2025-11-30"
```

### 2. 検索ログ集計

**GET** `/api/admin/analytics/search-logs`

検索ログと集計データを取得します。

**クエリパラメータ**:
- `start_date`, `end_date`: 期間フィルタ
- `limit` (optional): 取得件数（デフォルト: 100）
- `offset` (optional): オフセット

**レスポンス** (200 OK):
```json
{
  "data": {
    "logs": [
      {
        "id": "clx...",
        "keyword": "鬼",
        "icon_types": "[\"ONI\",\"DRAGON\"]",
        "era": "平安時代",
        "status": null,
        "results_count": 12,
        "user_id": "user_abc123",
        "session_id": null,
        "searched_at": "2025-11-23T10:30:00.000Z"
      }
    ],
    "total": 500,
    "limit": 100,
    "offset": 0,
    "aggregations": {
      "keywords": [
        { "keyword": "鬼", "count": 45 },
        { "keyword": "狐", "count": 32 }
      ],
      "iconTypes": [
        { "iconType": "[\"ONI\"]", "count": 78 },
        { "iconType": "[\"KITSUNE\"]", "count": 56 }
      ],
      "eras": [
        { "era": "平安時代", "count": 123 },
        { "era": "江戸時代", "count": 98 }
      ]
    }
  }
}
```

**POST** `/api/admin/analytics/search-logs`

検索ログを記録します（フロントエンドから呼び出し用）。

**リクエストボディ**:
```json
{
  "keyword": "鬼",
  "icon_types": ["ONI", "DRAGON"],
  "era": "平安時代",
  "status": "PUBLISHED",
  "results_count": 12,
  "user_id": "user_abc123",
  "session_id": "session_xyz"
}
```

**レスポンス** (200 OK):
```json
{
  "success": true
}
```

### 3. コンテンツ人気指標

**GET** `/api/admin/analytics/popularity`

スポットごとの人気指標（閲覧数、いいね、保存、シェア）を取得します。

**クエリパラメータ**:
- `start_date`, `end_date`: 期間フィルタ
- `limit` (optional): 取得件数（デフォルト: 20）

**レスポンス** (200 OK):
```json
{
  "data": {
    "popularity": [
      {
        "spot_id": "clx...",
        "spot_title": "酒呑童子の伝説",
        "spot_icon_type": "ONI",
        "spot_status": "PUBLISHED",
        "spot_created_at": "2025-10-15T08:00:00.000Z",
        "view_count": 450,
        "avg_duration_ms": 35000,
        "like_count": 78,
        "save_count": 34,
        "share_count": 12,
        "total_interactions": 124
      }
    ],
    "summary": {
      "total_views": 3450,
      "total_likes": 456,
      "total_saves": 234,
      "total_shares": 89
    }
  }
}
```

**人気スコア計算**:
```javascript
score = view_count + (total_interactions * 2)
```

インタラクション（いいね、保存、シェア）は閲覧より重要なため2倍の重みを付けています。

### 4. CSVエクスポート

**GET** `/api/admin/analytics/export`

分析データをCSV形式でダウンロードします。

**クエリパラメータ**:
- `type` (必須): `spot-history` | `search-logs` | `popularity`
- `start_date`, `end_date`: 期間フィルタ

**レスポンス** (200 OK):
- Content-Type: `text/csv; charset=utf-8`
- Content-Disposition: `attachment; filename="spot-history-2025-11-23.csv"`

**CSVフォーマット**:

**spot-history**:
```csv
スポットID,タイトル,追加者,追加日時,ステータス,アイコンタイプ
"clx...","酒呑童子の伝説","user_abc123","2025-11-23T10:30:00.000Z","PUBLISHED","ONI"
```

**search-logs**:
```csv
検索ID,キーワード,アイコンタイプ,時代,ステータス,結果件数,ユーザーID,検索日時
"clx...","鬼","[\"ONI\"]","平安時代","","12","user_abc123","2025-11-23T10:30:00.000Z"
```

**popularity**:
```csv
スポットID,タイトル,アイコンタイプ,ステータス,閲覧数,平均滞在時間(ms),いいね数,保存数,シェア数
"clx...","酒呑童子の伝説","ONI","PUBLISHED","450","35000","78","34","12"
```

**使用例**:
```bash
# 2025年11月の検索ログをCSVでエクスポート
curl "http://localhost:3000/api/admin/analytics/export?type=search-logs&start_date=2025-11-01&end_date=2025-11-30" \
  -o search-logs-2025-11.csv
```

## ダッシュボードUI

### アクセス

- URL: `/admin/analytics`
- ナビゲーション: 管理者レイアウトの「分析」メニュー（📈アイコン）

### 機能

#### 1. タブナビゲーション

3つのタブで情報を整理：

1. **スポット履歴タブ**
   - スポットの投稿一覧を時系列表示
   - 列: ID、タイトル、追加者、追加日時、ステータス、アイコンタイプ

2. **検索ログタブ**
   - 検索ログの詳細一覧
   - 人気キーワードランキング（上位20件）
   - フィルタ使用統計（アイコンタイプ、時代）

3. **人気指標タブ**
   - 人気スポットランキング
   - 閲覧数、平均滞在時間、インタラクション数を表示
   - 総合サマリー（全体の閲覧数、いいね数など）

#### 2. 期間フィルター

すべてのタブで共通の期間フィルタ：
- 開始日（start_date）
- 終了日（end_date）
- 「フィルタ適用」ボタン

フィルタは即座にAPIリクエストに反映されます。

#### 3. CSVエクスポート

各タブに「CSVエクスポート」ボタンを配置：
- クリックすると現在のタブとフィルタ条件に応じたCSVファイルをダウンロード
- ファイル名には日付が自動付与（例: `spot-history-2025-11-23.csv`）

#### 4. データ表示

**スポット履歴**:
```
┌──────────┬────────────┬──────────┬─────────────────┬──────────┬────────────┐
│ ID       │ タイトル   │ 追加者   │ 追加日時        │ ステータス│ アイコン    │
├──────────┼────────────┼──────────┼─────────────────┼──────────┼────────────┤
│ clx...   │ 酒呑童子   │ user_123 │ 2025-11-23 10:30│ PUBLISHED│ ONI        │
└──────────┴────────────┴──────────┴─────────────────┴──────────┴────────────┘
```

**検索ログ**:
```
上位キーワード:
1. 鬼 (45件)
2. 狐 (32件)
3. 龍 (28件)

検索ログ詳細:
┌──────────┬──────────┬──────────┬──────┬────────┬──────────┐
│ キーワード│ アイコン │ 時代     │ 件数 │ ユーザー│ 検索日時  │
├──────────┼──────────┼──────────┼──────┼────────┼──────────┤
│ 鬼       │ ONI      │ 平安時代 │ 12   │ user_123│ 2025-11-23│
└──────────┴──────────┴──────────┴──────┴────────┴──────────┘
```

**人気指標**:
```
総合サマリー:
- 総閲覧数: 3,450
- 総いいね: 456
- 総保存数: 234
- 総シェア: 89

人気ランキング:
┌──────────┬──────┬──────┬────────┬────┬────┬──────┐
│ タイトル │ 閲覧 │ 滞在 │ いいね │ 保存│ シェア│ 合計 │
├──────────┼──────┼──────┼────────┼────┼────┼──────┤
│ 酒呑童子 │ 450  │ 35s  │ 78     │ 34 │ 12 │ 124  │
└──────────┴──────┴──────┴────────┴────┴────┴──────┘
```

## 実装の詳細

### 認証と認可

すべてのAPIエンドポイントで統一された認証フロー：

```typescript
const supabase = await createSupabaseServerClient();
const { data: { user } } = await supabase.auth.getUser();

// 認証チェック
if (!user) {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: "認証が必要です" } },
    { status: 401 }
  );
}

// ロールチェック
const role = getUserRole(user);
if (!hasRole("reviewer", role)) {
  return NextResponse.json(
    { error: { code: "FORBIDDEN", message: "この操作にはreviewer以上の権限が必要です" } },
    { status: 403 }
  );
}
```

### データ集計

Prismaの `groupBy` を使用した効率的な集計：

```typescript
// キーワード集計（上位20件）
const keywordStats = await prisma.searchLog.groupBy({
  by: ["keyword"],
  where: {
    ...where,
    keyword: { not: null },
  },
  _count: { keyword: true },
  orderBy: { _count: { keyword: "desc" } },
  take: 20,
});
```

### 複数テーブルの集計

人気指標では複数のテーブルから独立して集計し、結果を結合：

```typescript
// 閲覧数
const viewStats = await prisma.spotView.groupBy({
  by: ["spot_id"],
  _count: { spot_id: true },
  _avg: { duration_ms: true },
});

// いいね数
const likeStats = await prisma.spotInteraction.groupBy({
  by: ["spot_id"],
  where: { type: "LIKE" },
  _count: { spot_id: true },
});

// 結果を結合
const spotIds = [...new Set([
  ...viewStats.map(s => s.spot_id),
  ...likeStats.map(s => s.spot_id),
])];

const popularityData = spotIds.map((spotId) => ({
  spot_id: spotId,
  view_count: viewStats.find(s => s.spot_id === spotId)?._count.spot_id || 0,
  like_count: likeStats.find(s => s.spot_id === spotId)?._count.spot_id || 0,
  // ...
}));
```

### パフォーマンス最適化

#### インデックス

頻繁にクエリされるフィールドにインデックスを追加：

```prisma
model SearchLog {
  // ...
  @@index([searched_at])  // 期間フィルタ用
  @@index([keyword])      // キーワード検索用
}

model SpotView {
  // ...
  @@index([spot_id])      // スポット別集計用
  @@index([viewed_at])    // 期間フィルタ用
}

model SpotInteraction {
  // ...
  @@index([spot_id])      // スポット別集計用
  @@index([type])         // タイプ別フィルタ用
  @@index([created_at])   // 期間フィルタ用
}
```

#### 並列クエリ

関連性のない複数のクエリは `Promise.all` で並列実行：

```typescript
const [spots, total] = await Promise.all([
  prisma.spot.findMany({ where, take: limit, skip: offset }),
  prisma.spot.count({ where }),
]);
```

## 使用シナリオ

### シナリオ1: コンテンツ改善

**目的**: どのようなコンテンツがユーザーに求められているかを理解する

**手順**:
1. `/admin/analytics` の「検索ログ」タブを開く
2. 人気キーワードランキングを確認
3. 結果件数が0のキーワードを特定
4. そのキーワードに関連する新しいスポットを追加

### シナリオ2: エンゲージメント分析

**目的**: 人気コンテンツの特徴を分析する

**手順**:
1. 「人気指標」タブで上位20件を確認
2. 高エンゲージメントコンテンツの `icon_type` や `era_hint` を分析
3. 類似のコンテンツを優先的に追加

### シナリオ3: 定期レポート作成

**目的**: 月次でコンテンツパフォーマンスをレポート

**手順**:
1. 期間フィルタで前月（例: 2025-11-01 〜 2025-11-30）を設定
2. 各タブでCSVエクスポートを実行
3. Excelやスプレッドシートで詳細分析

## セキュリティとプライバシー

### 個人情報の取り扱い

- **user_id**: ログインユーザーのSupabase UIDを記録（匿名化されたID）
- **session_id**: 未ログインユーザーの追跡に使用（Cookieベース）
- **IPアドレス**: 記録しません
- **ログの保持期間**: 現在は無期限（将来的にGDPR準拠のために検討）

### アクセス制御

- 分析データは reviewer以上のロールのみアクセス可能
- RLS（Row Level Security）は Supabase側で適用
- APIは全リクエストで認証トークンを検証

### データの匿名化

将来的な実装案：
- user_idをハッシュ化してレポートに表示
- 個別のユーザー行動ではなく集計データのみ表示

## トラブルシューティング

### Q: CSVエクスポートが文字化けする

**A**: CSVはUTF-8 BOM付きで出力しています。Excelで開く場合は以下の方法を試してください：
1. Excelで「データ」→「テキストから」でインポート
2. エンコーディングで「UTF-8」を選択
3. 区切り文字は「カンマ」を選択

### Q: 期間フィルタが効かない

**A**: 日付形式を確認してください：
- 正しい形式: `2025-11-01` (ISO 8601)
- 間違った形式: `11/01/2025`, `2025年11月1日`

### Q: 閲覧数が記録されない

**A**: フロントエンドから `POST /api/admin/analytics/search-logs` や `SpotView` の記録APIを呼び出す実装がまだ未実装の可能性があります。次のフェーズで実装予定です。

## 今後の拡張案

### フェーズ2: リアルタイム追跡

- スポット詳細ページに閲覧記録用のトラッキングコードを追加
- 検索フォームから自動的に検索ログを記録

### フェーズ3: 可視化強化

- Chart.jsやRechartsを使用したグラフ表示
- 時系列チャート（日別/週別/月別の推移）
- ヒートマップ（地域別の人気度）

### フェーズ4: 高度な分析

- ユーザーセグメンテーション（新規/リピーター）
- コンバージョンファネル（閲覧 → いいね → 保存）
- A/Bテスト機能

### フェーズ5: 自動レポート

- 週次/月次レポートの自動生成
- メール通知機能
- カスタムダッシュボード作成

## 関連ドキュメント

- **APIリファレンス**: `api_design.md`
- **データベーススキーマ**: `db_design.md`
- **開発ログ**: `development-log.md`
- **タスク管理**: `tasks.md`
