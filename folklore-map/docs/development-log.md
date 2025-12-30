# 開発ログ

このドキュメントは、民俗学マップの開発過程で行った作業、遭遇した問題、解決方法を時系列で記録しています。

---

## 2025-11-09: UI和風化と古地図比較機能の実装

### 実施した作業

#### 1. 和風フォントとデザインの適用

**目的**: Webページの雰囲気を和風にし、日本の民俗学アプリとしての世界観を演出する

**実装内容**:

**フォント変更**:
- `Noto Serif JP`（明朝体）: 本文とタイトルに使用
- `Zen Kaku Gothic New`（ゴシック体）: UI要素とナビゲーションに使用

```typescript
// src/app/layout.tsx
const notoSerifJP = Noto_Serif_JP({
  variable: "--font-serif-jp",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const zenKaku = Zen_Kaku_Gothic_New({
  variable: "--font-gothic-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});
```

**和風カラーパレット**:
- `washi` (#F5F1E8): 和紙色（背景）
- `washi-dark` (#E8E0D5): 濃い和紙色
- `sumi` (#2C2C2C): 墨色（テキスト）
- `shu` (#D84339): 朱色（アクセント）
- `ai` (#165E83): 藍色（セカンダリ）

**変更ファイル**:
- `src/app/layout.tsx` - フォント定義とヘッダー/フッターデザイン
- `src/app/globals.css` - カラーパレット定義
- `src/app/page.tsx` - トップページのデザイン更新

**効果**:
- 日本の伝統色を使用した落ち着いた雰囲気
- 読みやすい日本語フォント
- ホバー時の朱色アクセントで操作性向上

---

#### 2. icon_typeに応じたカスタムマーカーアイコンの実装

**目的**: 地図上のスポットを絵文字アイコンで視覚的に分かりやすく表示する

**実装内容**:

Google Maps APIの`AdvancedMarkerElement`を使用し、HTMLコンテンツとして絵文字を表示：

**アイコンマッピング**:
- ONI（鬼）: 👹
- KITSUNE（狐）: 🦊
- DRAGON（龍）: 🐉
- SHRINE（神社）: ⛩️
- TEMPLE（寺院）: 🏯
- ANIMAL（動物）: 🐾
- GENERIC（その他）: 📍

```typescript
// src/components/spot-map.tsx
const iconElement = document.createElement("div");
iconElement.innerHTML = `
  <div style="
    font-size: ${selectedId === spot.id ? "32px" : "28px"};
    cursor: pointer;
    filter: ${selectedId === spot.id
      ? "drop-shadow(0 0 8px rgba(216, 67, 57, 0.6))"
      : "drop-shadow(0 2px 4px rgba(0,0,0,0.3))"};
    transform: ${selectedId === spot.id ? "scale(1.2)" : "scale(1)"};
  ">
    ${getIconEmoji(spot.icon_type)}
  </div>
`;

const marker = new google.maps.marker.AdvancedMarkerElement({
  position: { lat: spot.lat, lng: spot.lng },
  map,
  title: spot.title,
  content: iconElement,
});
```

**変更ファイル**: `src/components/spot-map.tsx`

**効果**:
- 伝承の種類が一目で分かる
- 選択時のアニメーション効果（拡大、発光）
- アクセシビリティの向上

---

#### 3. 今昔マップ on the webとの統合

**目的**: 明治時代の古地図と現代地図を比較し、土地の変遷を視覚的に理解できるようにする

**調査内容**:

今昔マップ on the web（https://ktgis.net/kjmapw/）のタイルサービス仕様を調査：

- **タイルURL形式**: `https://ktgis.net/kjmapw/kjtilemap/{データセット}/{時期}/{z}/{x}/{y}.png`
- **利用可能地域**: 約80地域（首都圏、中京圏、京阪神圏、地方都市）
- **時代**: 1888年〜2010年代
- **ズームレベル**: 8〜16（東北・関東は8〜15）
- **座標系**: TMS形式（Y座標が南西起点）
- **利用規約**: 画面に「今昔マップ on the web」の表記が必要

**実装内容**:

Google MapsのImageMapTypeを使用してカスタムタイルレイヤーを実装：

```typescript
const historicalMapType = new google.maps.ImageMapType({
  getTileUrl: (coord, zoom) => {
    if (!coord || zoom < 8 || zoom > 16) {
      return "";
    }
    // TMS形式のY座標反転
    const ymax = 1 << zoom;
    const y = ymax - coord.y - 1;
    // 首都圏の明治期地図（1896-1909年）
    return `https://ktgis.net/kjmapw/kjtilemap/tokyo50/00/${zoom}/${coord.x}/${y}.png`;
  },
  tileSize: new google.maps.Size(256, 256),
  opacity: 0.7,
  name: "今昔マップ（明治期）",
});
```

**レイヤー切り替えUI**:
- 「現代地図」「明治期古地図」ボタンで切り替え
- 和風デザインのボタン（朱色・藍色）
- クレジット表記の自動切り替え

**変更ファイル**: `src/components/spot-map.tsx`

**効果**:
- 明治時代と現代の地形比較が可能
- 都市開発や地形変化の可視化
- 歴史的コンテクストの理解促進

---

### 技術メモ

#### AdvancedMarkerElementの使用

Google Maps JavaScript APIの新しいマーカーAPI（AdvancedMarkerElement）を使用：

**利点**:
- HTMLコンテンツの直接描画
- CSSアニメーションの適用
- パフォーマンスの向上

**注意点**:
- `mapId`パラメータが必須
- 従来の`google.maps.Marker`とは異なるAPI

#### TMS形式のY座標反転

今昔マップはTMS（Tile Map Service）形式を使用しており、Y座標の計算方法が異なる：

```typescript
// XYZ形式 → TMS形式への変換
const ymax = 1 << zoom; // 2^zoom
const y = ymax - coord.y - 1;
```

#### Google Fontsの動的読み込み

Next.js 16の`next/font/google`を使用してフォントを最適化：

- 自動サブセット化
- フォント表示戦略（display: swap）
- CSS変数での管理

---

### 今後の改善点

- [ ] 複数時代の古地図切り替え（大正期、昭和初期など）
- [ ] 透明度スライダーの追加
- [x] ~~地域ごとの古地図データセット自動選択~~ （完了）
- [ ] サイドバイサイド比較ビューの実装
- [ ] レスポンシブデザインの改善（モバイル対応）

---

#### 4. 今昔マップの全国対応

**問題**: 今昔マップが関東地域（tokyo50）のみ表示されており、他の地域で古地図が表示されなかった

**解決策**: タイル座標から緯度経度を計算し、表示位置に応じて適切な地域データセットを自動選択する機能を実装

**実装内容**:

対応地域（16地域）:
- **北海道**: 札幌、函館
- **東北**: 青森、仙台
- **関東**: 東京（首都圏）
- **中部**: 新潟、長野、名古屋（中京圏）
- **関西**: 大阪・京都（京阪神圏）
- **中国**: 岡山、広島
- **四国**: 高松、松山
- **九州**: 福岡、熊本、鹿児島
- **沖縄**: 那覇

```typescript
// タイル座標から緯度経度への変換
function tile2lat(y: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function tile2lng(x: number, zoom: number): number {
  return (x / Math.pow(2, zoom)) * 360 - 180;
}

// 座標範囲に基づいてデータセットを選択
function selectDatasetByLocation(lat: number, lng: number) {
  // 各地域の緯度経度範囲を定義
  const datasets = [
    { folder: "sapporo", period: "00", minLat: 42.8, maxLat: 43.3, ... },
    { folder: "keihansin", period: "00", minLat: 34.4, maxLat: 35.1, ... },
    // ... 他の地域
  ];

  // 該当する地域を検索
  for (const dataset of datasets) {
    if (lat >= dataset.minLat && lat <= dataset.maxLat && ...) {
      return { folder: dataset.folder, period: dataset.period };
    }
  }

  // デフォルトは首都圏
  return { folder: "tokyo50", period: "00" };
}
```

**効果**:
- 日本全国どこでも古地図が表示される
- 地域を移動すると自動的に適切な古地図データセットに切り替わる
- ユーザーが地域を意識する必要がない

**変更ファイル**: `src/components/spot-map.tsx`

---

**最終更新**: 2025-11-12

---

## 2025-11-12: テスト & CI/CD 実装とデプロイ準備完了

### 実施した作業

#### 1. Vitest テストフレームワークのセットアップ

**目的**: コード品質を保証し、リグレッションを防止するためのユニットテスト環境を構築

**実装内容**:

**依存関係のインストール**:
```bash
pnpm add -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom
pnpm add -D @vitejs/plugin-react @vitest/coverage-v8
```

**設定ファイル** (`vitest.config.ts`):
```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
```

**テストスクリプト追加** (`package.json`):
- `pnpm test`: Vitest実行
- `pnpm test:ui`: Vitest UIモード
- `pnpm test:coverage`: カバレッジレポート生成

**変更ファイル**:
- `vitest.config.ts` (新規)
- `src/__tests__/setup.ts` (新規)
- `package.json` (scripts追加)

---

#### 2. ユニットテストの実装（26件）

**実装したテストスイート**:

##### a) Zodスキーマテスト (`src/__tests__/lib/schemas/spots.test.ts`)

**12件のテスト**:
- ✅ 正常なスポット作成データを検証できる
- ✅ タイトルが短すぎる場合はエラー (2文字未満)
- ✅ タイトルが長すぎる場合はエラー (80文字超)
- ✅ 説明文が3000文字を超える場合はエラー
- ✅ 出典が1件以上必須
- ✅ URL型の出典にはURLが必須
- ✅ BOOK型の出典はURLなしでOK
- ✅ 緯度・経度の範囲チェック (-90〜90, -180〜180)
- ✅ icon_typeの値チェック
- ✅ 部分更新が可能 (SpotUpdateSchema)
- ✅ ステータス更新が可能
- ✅ 無効なステータスはエラー

##### b) 認証・権限テスト (`src/__tests__/lib/auth.test.ts`)

**6件のテスト**:
- ✅ 同じロールの場合はtrue
- ✅ 上位ロールは下位ロールの権限を持つ (admin > reviewer > editor > viewer)
- ✅ 下位ロールは上位ロールの権限を持たない
- ✅ nullロールは何も持たない
- ✅ ROLE_PRIORITYが正しく定義されている
- ✅ 境界条件: 現在のロールがnullの場合

**修正内容**:
- `ROLE_PRIORITY`をエクスポート
- `hasRole()`関数で`current: UserRole | null`を許容

##### c) サニタイゼーションテスト (`src/__tests__/lib/sanitize.test.ts`)

**8件のテスト**:
- ✅ HTMLタグを削除する (`stripHtml`)
- ✅ 通常の文字列はそのまま返す
- ✅ スクリプトタグを削除する
- ✅ 複数のタグが混在する場合
- ✅ HTMLの特殊文字をエスケープする (`escapeHtml`)
- ✅ HTMLタグを削除して特殊文字をエスケープする (`sanitizeText`)
- ✅ 空文字列を処理できる

**テスト結果**:
```
✓ src/__tests__/lib/sanitize.test.ts (8 tests) 9ms
✓ src/__tests__/lib/auth.test.ts (6 tests) 4ms
✓ src/__tests__/lib/schemas/spots.test.ts (12 tests) 10ms

Test Files  3 passed (3)
Tests  26 passed (26)
```

---

#### 3. GitHub Actions CI/CD パイプラインの構築

**目的**: コードプッシュ時に自動的にlint/test/buildを実行し、品質を保証

**実装内容**:

**ワークフローファイル** (`.github/workflows/ci.yml`):

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Setup pnpm
      - Setup Node.js 20
      - Install dependencies
      - Run ESLint
      - Run TypeScript check
      - Run tests

  build:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Setup pnpm
      - Setup Node.js 20
      - Install dependencies
      - Generate Prisma Client
      - Build application
      - Upload build artifacts
```

**実行されるチェック**:
1. **ESLint**: コードスタイルと潜在的バグをチェック
2. **TypeScript**: 型エラーをチェック (`tsc --noEmit`)
3. **Vitest**: ユニットテスト実行
4. **Build**: 本番ビルドの成功を確認

**効果**:
- Pull Request作成時に自動的にCIが実行
- マージ前に問題を検出
- ビルドアーティファクトを7日間保存

---

#### 4. Vercelデプロイ設定の準備

**実装内容**:

**Vercel設定ファイル** (`vercel.json`):
```json
{
  "buildCommand": "pnpm build",
  "framework": "nextjs",
  "regions": ["hnd1"],
  "env": {
    "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY": "@google_maps_api_key",
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase_url",
    ...
  }
}
```

**デプロイドキュメント** (`DEPLOYMENT.md`):
- Supabase本番環境のセットアップ手順
- Google Maps API キーの取得と制限設定
- Vercelプロジェクトの作成手順
- カスタムドメインの設定
- 初期データの投入方法
- 監視とバックアップ設定
- トラブルシューティング
- コスト見積もり（無料枠内での運用可能規模）

---

#### 5. プロジェクトドキュメントの整備

**作成したドキュメント**:

##### a) README.md
- プロジェクト概要と主な機能
- 技術スタック
- セットアップ手順
- テスト実行方法
- プロジェクト構造
- セキュリティ対策
- コントリビューションガイド
- 謝辞

##### b) 開発ログ更新
- T06（フロント機能実装）の詳細記録
- T09（テスト & CI）の詳細記録
- T10（デプロイ準備）の詳細記録

##### c) tasks.md更新
- T09, T10, T11を「完了」に更新
- 各タスクの完了日と成果物を記録

---

### 技術メモ

#### Vitestの利点

- **高速**: Vite駆動で起動が速い
- **モダンAPI**: Jest互換だが、よりシンプルなAPI
- **TypeScript統合**: 追加設定なしでTypeScriptをサポート
- **UIモード**: `pnpm test:ui`でブラウザベースのテストUIを起動可能

#### GitHub Actions のベストプラクティス

- **並列実行**: `lint-and-test` と `build` を分離して並列実行
- **キャッシュ**: pnpmキャッシュで依存関係のインストールを高速化
- **タイムアウト**: 無限ループを防ぐため各ジョブに10-15分のタイムアウト設定
- **アーティファクト**: ビルド結果を保存して後続ジョブやデバッグに活用

---

### 今後の改善点

- [ ] API統合テストの追加（Supabaseモック使用）
- [ ] E2Eテスト（Playwright）の実装
- [ ] テストカバレッジ80%以上を目標
- [ ] CI/CDでテストカバレッジレポートを自動生成
- [ ] Dependabotで依存関係の自動更新

---

### 完了したタスク

| タスクID | タスク | 完了日 |
|---------|--------|--------|
| T09 | テスト & CI | 2025-11-12 |
| T10 | デプロイ & 運用 | 2025-11-12 |
| T11 | ドキュメント更新 | 2025-11-12 |

---

## 2025-11-12: 高度検索機能とレビュー履歴差分表示の実装

### 実施した作業

#### 1. 高度検索機能の実装（タグ・時代・エリア絞り込み）

**目的**: スポット一覧で多様な条件による絞り込み検索を可能にし、ユーザーが目的の伝承を素早く発見できるようにする

**実装内容**:

**フィルター機能**:
- **タグ（icon_type）フィルタ**: 複数選択可能
  - 鬼（ONI）、狐（KITSUNE）、犬（DOG）、龍（DRAGON）
  - 寺院（TEMPLE）、神社（SHRINE）、動物（ANIMAL）、その他（GENERIC）
- **時代フィルタ**: `era_hint`フィールドによる絞り込み（例: 平安時代、江戸時代）
- **キーワード検索**: タイトルと説明文の全文検索
- **地図範囲フィルタ（bbox）**: 現在表示中の地図範囲内のスポットのみ表示

**UI実装**:
```typescript
// src/components/spot-explorer.tsx
const [selectedIconTypes, setSelectedIconTypes] = useState<string[]>([]);
const [eraFilter, setEraFilter] = useState("");
const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
```

- 「詳細検索」ボタン（Filterアイコン）で高度検索パネルを表示/非表示
- 選択中のフィルタをタグで視覚的に表示
- 「✕」ボタンでフィルタを個別解除、「クリア」ボタンで一括解除
- フィルター適用中はローディングインジケータを表示

**URL連携**:
- フィルター条件をURLクエリパラメータに自動保存
- ブックマーク可能な検索URL生成（例: `/?icon_types=ONI,KITSUNE&era=平安時代&q=鬼`）
- ページリロード時にURLからフィルター状態を復元

```typescript
// URLクエリパラメータからフィルター初期値を読み込む
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const iconTypesParam = params.get("icon_types");
  const eraParam = params.get("era");
  const qParam = params.get("q");

  if (iconTypesParam) {
    setSelectedIconTypes(iconTypesParam.split(",").filter(Boolean));
    setShowAdvancedSearch(true);
  }
  if (eraParam) setEraFilter(eraParam);
  if (qParam) setFilterTerm(qParam);
}, []);
```

**API統合**:
- `/api/spots` にクエリパラメータを送信
- サーバーサイドでの効率的な検索処理（Prisma `where` 句）
- リアルタイムな結果更新（`applyFilters()` 関数）

**変更ファイル**:
- `src/components/spot-explorer.tsx` - 高度検索UI実装
- `src/app/api/spots/route.ts` - 検索クエリ処理拡張（icon_types, era, bbox対応）

**効果**:
- 104件のデータから目的の伝承を素早く発見
- 地図操作と連動した動的フィルタリング
- ブックマーク可能な検索結果共有

---

#### 2. レビューパネルの履歴差分表示機能

**目的**: スポット編集時の変更履歴を視覚的に表示し、レビュー作業を効率化する

**実装内容**:

**履歴取得API** (`/api/spots/[id]/history`):
```typescript
// src/app/api/spots/[id]/history/route.ts
export async function GET(_request: NextRequest, { params }: Params) {
  // Auditテーブルから変更履歴を取得
  const audits = await prisma.audit.findMany({
    where: {
      entity: "Spot",
      entity_id: id,
      action: "UPDATE",
    },
    orderBy: { at: "desc" },
    take: 50, // 最新50件まで
  });

  // 変更履歴をフォーマット
  const history = audits.map((audit) => ({
    id: audit.id,
    timestamp: audit.at.toISOString(),
    user_id: audit.by,
    changes: detail?.changes || {},
    previous: detail?.previous || {},
  }));

  return jsonResponse({ spot_id: id, history });
}
```

**権限チェック**:
- 作成者（`created_by`）またはreviewer以上のみ閲覧可能
- 権限不足時は 403 Forbidden を返却

**履歴差分表示コンポーネント** (`history-diff.tsx`):

**3種類の差分表示モード**:
1. **インライン差分（短文フィールド）**:
   ```
   [タイトル] → [新タイトル]
   ```
   - 変更前を取り消し線で赤背景（`bg-red-50`, `border-red-200`, `text-red-700`, `line-through`）
   - 変更後を緑背景（`bg-emerald-50`, `border-emerald-200`, `text-emerald-700`）

2. **ブロック差分（長文フィールド）**:
   - `description` など100文字超のフィールドは上下に並べて比較
   - 変更前ブロック（赤）と変更後ブロック（緑）を2段表示
   - 全文を読みやすく表示

3. **JSON差分（配列・オブジェクト）**:
   - `sources` など複雑なデータは整形済みJSONで表示
   - 2カラムレイアウト（左: 変更前、右: 変更後）
   - シンタックスハイライト風の背景色

**視覚デザイン**:
```typescript
// 各履歴エントリをカード形式で表示
<div className="rounded-lg border border-border bg-card p-4 shadow-sm">
  <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
    <p className="text-xs text-muted-foreground">
      {format(new Date(entry.timestamp), "yyyy年MM月dd日 HH:mm:ss", { locale: ja })}
    </p>
    <p className="text-xs text-muted-foreground">
      変更者: {entry.user_id.slice(0, 8)}...
    </p>
  </div>
  <div className="space-y-3">
    {changes.map((change) => <FieldDiff key={change.field} change={change} />)}
  </div>
</div>
```

**日本語フィールド名表示**:
```typescript
const labels: Record<string, string> = {
  title: "タイトル",
  description: "概要",
  address: "住所",
  icon_type: "アイコンタイプ",
  era_hint: "時代情報",
  status: "ステータス",
  lat: "緯度",
  lng: "経度",
  maps_query: "地図クエリ",
  maps_place_id: "Google Place ID",
};
```

**レビューパネル統合** (`review-panel.tsx`):
```typescript
// 履歴取得関数
async function loadHistory(spotId: string) {
  setLoadingHistory(true);
  try {
    const res = await fetch(`/api/spots/${spotId}/history`);
    if (!res.ok) throw new Error("履歴の取得に失敗しました。");
    const data = await res.json();
    setHistory(data.data);
    setShowHistory(true);
  } catch (error) {
    setStatus({ kind: "error", message: error.message });
  } finally {
    setLoadingHistory(false);
  }
}
```

- 「変更履歴を表示」ボタンで履歴を取得・表示
- `HistoryDiff` コンポーネントで履歴をレンダリング
- ローディング状態の管理
- エラーハンドリングとユーザーへのフィードバック
- スポット切り替え時に履歴状態をリセット

**型定義** (`lib/types/history.ts`):
```typescript
export type HistoryEntry = {
  id: string;
  timestamp: string;
  user_id: string;
  changes: Record<string, unknown>;   // 変更後の値
  previous: Record<string, unknown>;  // 変更前の値
};

export type SpotHistory = {
  spot_id: string;
  history: HistoryEntry[];
};
```

**変更ファイル**:
- `src/app/api/spots/[id]/history/route.ts` - 履歴取得API（新規作成）
- `src/components/history-diff.tsx` - 差分表示コンポーネント（新規作成）
- `src/components/review-panel.tsx` - 履歴表示機能統合
- `src/lib/types/history.ts` - 履歴型定義（新規作成）

**効果**:
- レビュワーが編集内容を一目で把握可能
- 変更前後の比較が視覚的に明確
- 操作履歴の透明性向上
- 不正な編集や誤操作の検出が容易に

---

#### 3. 管理者サイトの機能強化

**詳細**: `docs/admin-site-guide.md` に記録済み

**実装された機能**:
- **ダッシュボード** (`/admin`): 統計表示、最近のスポット・通報一覧
- **スポット管理** (`/admin/spots`): 検索、フィルタ、一覧表示、削除（個別・一括）
- **通報管理** (`/admin/flags`): フィルタ、詳細表示、処理
- **AdminLayout** コンポーネント: サイドバーナビゲーション、共通レイアウト
- **統計API** (`/api/admin/stats`): システム全体の統計を返却

**主な変更ファイル**:
- `src/app/admin/page.tsx` - ダッシュボード
- `src/app/admin/spots/page.tsx` - スポット管理
- `src/app/admin/flags/page.tsx` - 通報管理
- `src/app/admin/users/page.tsx` - ユーザー管理（プレースホルダー）
- `src/components/admin-layout.tsx` - 管理者レイアウト
- `src/app/api/admin/stats/route.ts` - 統計API

詳細は `docs/admin-site-guide.md` を参照。

---

### 技術メモ

#### Auditテーブルの活用

**Auditテーブル** (`prisma/schema.prisma`):
```prisma
model Audit {
  id          String   @id @default(cuid())
  entity      String   // "Spot", "Flag", etc.
  entity_id   String
  action      String   // "CREATE", "UPDATE", "DELETE"
  by          String   // ユーザーID
  at          DateTime @default(now())
  detail_json Json?    // { previous: {...}, changes: {...} }
}
```

- すべての編集操作を記録
- `detail_json` に変更前（`previous`）と変更後（`changes`）を保存
- タイムスタンプとユーザーIDで変更履歴を追跡
- 50件制限で履歴表示のパフォーマンスを確保

#### URL State Management

フィルター状態をURLクエリパラメータで管理する利点:
- ブックマーク可能
- 共有可能（URLをコピーして送信）
- ブラウザの戻る/進むボタンで履歴移動
- リロード時に状態を保持

```typescript
// フィルター適用時にURLを更新
const newUrl = params.toString()
  ? `${window.location.pathname}?${params.toString()}`
  : window.location.pathname;
window.history.replaceState({}, "", newUrl);
```

---

### 今後の改善点

- [ ] 履歴差分でワードレベルの差分表示（現在は文字列全体の比較のみ）
- [ ] 履歴のページネーション（現在は最新50件のみ）
- [ ] 履歴のエクスポート機能（CSV, JSON）
- [ ] 高度検索の保存機能（お気に入り検索条件）
- [ ] 地図範囲フィルタのUI改善（「現在の範囲で検索」ボタン）
- [ ] フィルターのプリセット（例: 「平安時代の鬼伝承」）

---

## 2025-11-08: 初期開発とNext.js 16互換性対応

### 実施した作業

#### 1. 環境変数の設定と修正

**問題**: Google Maps APIキーが正しく読み込まれていなかった

**原因**:
- `folklore-map/.env`ファイルに古いPrismaのダミーデータが残っていた
- `.env.local`との不整合があった

**解決**:
- `.env`ファイルを正しい認証情報で更新
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyAlolqWBLgsZ_8eLLRibzoRIUQ5bUm0HIc
GOOGLE_MAPS_API_KEY=AIzaSyAlolqWBLgsZ_8eLLRibzoRIUQ5bUm0HIc
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

**変更ファイル**: `folklore-map/.env`

---

#### 2. Google Maps JavaScript API エラーの修正

**問題**:
- `ApiProjectMapError`と`NoApiKeys`エラーが発生
- コンソールに「Google Maps JavaScript API error」が表示される

**原因**:
- `@googlemaps/js-api-loader`の`setOptions()`メソッドで誤ったパラメータ名を使用
- `apiKey`ではなく`key`が正しいパラメータ名
- 不要な`libraries`パラメータを指定していた

**解決**: `src/components/spot-map.tsx`を修正

```typescript
// 修正前
setOptions({
  apiKey: apiKey,
  version: "weekly",
  libraries: ["marker"],
});

// 修正後
setOptions({
  key: apiKey,
  version: "weekly",
});
```

また、ハードコードされたフォールバックAPIキーを削除し、適切なエラーハンドリングを追加。

**変更ファイル**: `src/components/spot-map.tsx`

**参考**: この修正により、Google Maps APIが正常に動作するようになった。

---

#### 3. 初期データの投入（10件の日本民俗学伝承）

**目的**: Google検索で日本の民俗学伝承を調査し、データベースに10件登録する

**実施内容**:

収集した伝承データ:
1. 酒呑童子の伝説（京都府福知山市）- 平安時代
2. 九尾の狐と殺生石（栃木県那須町）- 平安時代末期
3. 鞍馬天狗と牛若丸（京都市左京区）- 平安時代末期
4. 筑後川の河童伝説（福岡県久留米市）- 江戸時代以前
5. 桃太郎と温羅退治（岡山県岡山市）- 古代
6. 座敷わらしの緑風荘（岩手県二戸市）- 南北朝時代
7. 雪女の伝説（新潟県小千谷市）- 室町時代以前
8. ヤマタノオロチ退治（島根県雲南市）- 神話時代
9. 天の岩戸伝説（宮崎県高千穂町）- 神話時代
10. 牛若丸と弁慶の出会い（京都市下京区）- 平安時代末期

**作成したファイル**: `scripts/seed-data.ts`

データ構造:
- タイトル、詳細説明（200-300文字程度）
- 住所情報
- アイコンタイプ（ONI, KITSUNE, DRAGON, SHRINE, ANIMAL, GENERIC）
- 時代ヒント
- 出典情報（URLと引用元）

地理的プライバシー機能:
- 座標の信頼度に基づいてぼかし半径を自動選択（100m/200m/300m）
- ランダムオフセットを適用して正確な位置を隠す

**実行コマンド**:
```bash
pnpm seed
```

**変更ファイル**:
- `scripts/seed-data.ts`（新規作成）
- `package.json`（`seed`スクリプト追加、`tsx`依存関係追加）

**結果**: 10件のデータが正常にデータベースに登録され、マップ上に表示されることを確認。

---

#### 4. Next.js 16互換性問題の修正

**問題**: スポット詳細取得時に「詳細の取得に失敗しました」エラーが発生

**原因1**: Next.js 16では`params`が非同期Promiseオブジェクトに変更された

**解決**: API RouteハンドラでParamsの型定義と取得方法を修正

```typescript
// 修正前
type Params = {
  params: {
    id: string;
  };
};

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = params;  // 直接アクセス
  // ...
}

// 修正後
type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;  // awaitが必要
  // ...
}
```

**変更ファイル**:
- `src/app/api/spots/[id]/route.ts`（GETとPATCHハンドラ）
- `src/app/api/flags/[id]/route.ts`（PATCHハンドラ）

---

**原因2**: Next.js 16では`cookies()`関数が非同期に変更され、Supabase SSRの推奨パターンも変更された

**問題の詳細**:
```
TypeError: cookieStore.get is not a function
```

Supabase SSRパッケージ（@supabase/ssr）は、Next.js 15以前では`get()`, `set()`, `remove()`メソッドを使用していたが、Next.js 16では`getAll()`, `setAll()`パターンが推奨されている。

**解決**: `src/lib/supabase/server.ts`を2025年1月時点の推奨実装に更新

```typescript
// 修正前（古いパターン）
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();  // awaitは追加済み

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options?: CookieOptions) {
        cookieStore.set(name, value, options);
      },
      remove(name: string, options?: CookieOptions) {
        if (options) {
          cookieStore.set(name, "", { ...options, maxAge: 0 });
        } else {
          cookieStore.delete(name);
        }
      },
    },
  });
}

// 修正後（新しいパターン）
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
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
    },
  });
}
```

**変更ファイル**: `src/lib/supabase/server.ts`

**参考**: [Supabase公式ドキュメント - Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)

---

#### 5. 動作確認

すべての修正後、以下を確認:

**スポット一覧API**:
```bash
curl http://localhost:3000/api/spots
```
→ 10件のスポットが正常に返される

**スポット詳細API**:
```bash
curl http://localhost:3000/api/spots/cmhqcds7t00003oomgkueft1f
```
→ タイトル、説明、座標、出典URLを含む完全なデータが返される

```json
{
  "data": {
    "id": "cmhqcds7t00003oomgkueft1f",
    "title": "酒呑童子の伝説",
    "description": "一条天皇の時代、京の若者や姫君が...",
    "sources": [
      {
        "id": "cmhqcds7t00013oom7xpf910c",
        "type": "URL",
        "citation": "YAMAP MAGAZINE「京都大江山 酒呑童子」",
        "url": "https://yamap.com/magazine/11300"
      }
    ]
  }
}
```

**フロントエンド**:
- マップ上に10個のマーカーが正常に表示される
- マーカークリックで詳細モーダルが開き、出典URLが表示される

---

### トラブルシューティング情報の追加

`docs/setup-guide.md`のトラブルシュート章に以下を追記:

**スポット詳細取得で "cookieStore.get is not a function" エラーが出る**
- Next.js 16 では `cookies()` API と Supabase SSR の連携方法が変更されました
- `src/lib/supabase/server.ts` で `getAll()` / `setAll()` パターンを使用する必要があります（2025年1月時点の推奨実装）
- 詳細は [Supabase公式ドキュメント](https://supabase.com/docs/guides/auth/server-side/nextjs) を参照

---

### 今後の開発タスク

- [ ] ユーザー認証フローの実装（Supabase Auth）
- [ ] 投稿フォームの完成とバリデーション
- [ ] レビュー画面の実装（reviewer/admin権限）
- [ ] 通報機能の実装
- [ ] Google Geocoding API統合による住所→座標変換
- [ ] 画像アップロード機能（Supabase Storage連携）
- [ ] レスポンシブデザインの改善
- [ ] E2Eテストの追加
- [ ] CI/CDパイプラインの構築

---

### 技術メモ

#### Next.js 16での主な変更点

1. **Route Handler params**: 同期オブジェクトから非同期Promiseに変更
   - 影響: すべての動的ルートで`await params`が必要

2. **cookies() API**: 非同期関数に変更
   - 影響: `await cookies()`が必要

3. **Supabase SSR統合**: Cookie処理パターンの変更
   - 影響: `getAll()` / `setAll()`パターンへの移行が必要

#### データモデル

**Spot（スポット）**:
- `id`, `title`, `description`
- `lat`, `lng`（ぼかし適用済み座標）
- `blur_radius_m`（100/200/300）
- `icon_type`, `era_hint`
- `status`（DRAFT/SUBMITTED/PUBLISHED）
- `created_by`（Supabase Auth UID）

**Source（出典）**:
- `id`, `spot_id`
- `type`（URL/BOOK）
- `citation`, `url`

---

## 開発環境

- Node.js: 20.x LTS
- pnpm: 10.x
- Next.js: 16.0.1
- React: 19.2.0
- Prisma: 6.18.0
- Supabase SSR: 0.7.0
- Google Maps API Loader: 2.0.2
- TypeScript: 5.x

---

## 2025-11-09: 104件の全国網羅データの実装

### 実施した作業

**目的**: 日本全国各地の民俗学伝承を網羅したデモデータを104件実装し、アプリケーションの実用性を向上させる

**実装内容**:

#### データ構成
- **既存データ**: 10件（酒呑童子、九尾の狐、ヤマタノオロチなど）
- **北海道・東北**: 15件（義経北行伝説、アイヌコタン、恐山、なまはげ、白虎隊など）
- **関東**: 15件（平将門の首塚、浅草寺、鎌倉大仏、日光東照宮など）
- **中部**: 20件（善光寺、諏訪大社、富士講、熱田神宮、白川郷など）
- **関西**: 10件（清水寺、伏見稲荷、金閣寺、東大寺、熊野古道など）
- **中国**: 8件（鳥取砂丘、三徳山投入堂、出雲大社、厳島神社など）
- **四国**: 8件（四国八十八ヶ所、鳴門の渦潮、祖谷のかずら橋など）
- **九州・沖縄**: 18件（博多祇園山笠、太宰府、阿蘇山、屋久島、首里城など）

#### icon_typeのバランス
- `SHRINE`（神社・寺院）: 約60件
- `GENERIC`（その他・一般）: 約25件
- `ONI`（鬼）: 3件
- `DRAGON`（龍）: 3件
- `ANIMAL`（動物）: 5件
- `KITSUNE`（狐）: 1件
- `DOG`（犬）: 0件

#### 新規作成ファイル
**`scripts/seed-data-100.ts`**:
- 104件の伝承データを定義
- 全国の座標マッピング（約70箇所の地名→座標変換）
- ぼかし処理の適用（100/200/300m）
- 出典情報（URL/書籍）の付与

#### 座標マッピング追加箇所
- 中部地方: 長野県、山梨県、静岡県、愛知県、岐阜県、三重県、滋賀県の主要地点
- 中国地方: 鳥取県、島根県、岡山県、広島県、山口県の主要地点
- 四国地方: 徳島県、香川県、愛媛県、高知県の主要地点
- 九州・沖縄: 福岡県、佐賀県、長崎県、大分県、宮崎県、鹿児島県、沖縄県の主要地点

#### 実行結果
```bash
pnpm tsx scripts/seed-data-100.ts
```
- データベースに104件のスポットを登録
- 各スポットに出典情報を付与
- 座標にプライバシー保護のぼかし処理を適用

#### ドキュメント更新
- `README.md`: データ件数を10件→104件に更新
- `src/app/page.tsx`: 実装済み機能リストを更新（104件データ、古地図比較機能を追加）

### 技術的な詳細

**データ設計**:
- 各エントリに `title`, `description`, `address`, `icon_type`, `era_hint`, `sources` を定義
- 説明文は200〜300文字程度で統一
- 出典は URL または 書籍 のいずれかを必須化

**座標変換**:
- `getMockCoordinates()` 関数で住所文字列から緯度経度を取得
- `selectBlurRadius()` でジオコーディング信頼度に基づきぼかし半径を決定
- `applyBlur()` でランダムオフセットを適用し正確な位置を隠蔽

**地域カバレッジ**:
- 日本全国47都道府県のうち、主要な伝承地を含む約35都道府県をカバー
- 今昔マップ on the webの16地域データセットに対応した配置

### 成果

- データ件数が10件から104件に増加
- 全国各地の多様な民俗学伝承を網羅
- icon_typeのバリエーションが増加（鬼、狐、龍、神社、寺院、動物など）
- 時代も古代から明治・昭和まで幅広くカバー
- 古地図比較機能と組み合わせ、各地の歴史的変遷を視覚的に理解可能

### 今後の改善点

- icon_typeの「DOG」（犬）のエントリを追加（現在0件）
- icon_typeの「KITSUNE」（狐）のエントリを増加（現在1件）
- 未カバーの都道府県（北陸、山陰など）の伝承を追加
- より詳細な出典情報（ページ番号、発行年など）の付与
- 画像データの追加（Supabase Storage連携）

---

## 2025-11-12: スポット一覧表示バグの修正

### 実施した作業

#### 1. 開発サーバーの起動とエラーの発見

**状況**:
- ユーザー用と管理者用の両システムを起動
- トップページでスポット一覧が「0 件」と表示される問題が発生
- データベースには88件の公開スポットが存在していることを確認

#### 2. `created_at` フィールドエラーの修正

**問題**:
`src/app/api/spots/route.ts` で存在しないフィールド `created_at` を select しようとしてPrismaエラーが発生。

**エラーメッセージ**:
```
Invalid `prisma.spot.findMany()` invocation
Unknown field `created_at` for select statement on model `Spot`.
Available options are marked with ?.
```

**原因**:
- Prismaスキーマには `updated_at` のみ存在し、`created_at` フィールドは存在しない
- 管理者権限の場合に追加情報を取得する際に `created_at` を含めていた

**修正内容** (`src/app/api/spots/route.ts:132-136`):
```typescript
// Before
...(includeDetails && {
  description: true,
  address: true,
  created_at: true,  // ❌ 存在しないフィールド
  created_by: true,
}),

// After
...(includeDetails && {
  description: true,
  address: true,
  created_by: true,  // ✅ created_at を削除
}),
```

**確認方法**:
- `.next` キャッシュを削除して開発サーバーを再起動
- `/api/spots?` エンドポイントが 200 ステータスを返すことを確認

---

#### 3. スポット一覧が一瞬表示されて消える問題の修正

**問題**:
- 初回ロード時に88件のスポットが一瞬表示されるが、すぐに「0 件」になる
- APIは正常に動作しているが、クライアント側のステート管理に問題

**原因の調査**:

1. **bbox フィルターの影響**:
   - 地図の表示範囲（bbox）で自動的にフィルターがかかっていた
   - 初期表示時の地図範囲外のスポットが除外されていた

2. **APIレスポンス構造の不一致**:
   ```typescript
   // APIレスポンス構造
   {
     "data": {
       "items": [...]
     }
   }

   // コードは直接 data.items を期待
   const data = await res.json();
   setSpots(data.items);  // ❌ undefined になる
   ```

3. **フィルターロジックの問題**:
   - `useEffect` が依存配列の変更のたびに実行され、不要なAPI呼び出しが発生
   - フィルターが適用されていない場合も API を呼んでいた

**修正内容**:

##### a) bbox フィルターの無効化 (`src/components/spot-explorer.tsx`)

```typescript
// Before
if (mapBounds) {
  params.set("bbox", `${mapBounds.west},${mapBounds.south},${mapBounds.east},${mapBounds.north}`);
}

// After
// bbox フィルターは無効化（全スポットを表示）
// if (mapBounds) {
//   params.set("bbox", `${mapBounds.west},${mapBounds.south},${mapBounds.east},${mapBounds.north}`);
// }
```

- `mapBounds` state を削除
- `onBoundsChange` ハンドラーを削除
- `SpotMap` コンポーネントから `onBoundsChange` props を削除

##### b) APIレスポンスのパース修正

```typescript
// Before
const data = await res.json();
setSpots(data.items || data.spots || []);

// After
const response = await res.json();
const data = response.data || response;
setSpots(data.items || data.spots || []);
```

##### c) フィルターロジックの最適化

```typescript
useEffect(() => {
  // フィルターが何も適用されていない場合は何もしない（initialSpotsをそのまま使う）
  const hasFilters = filterTerm || selectedIconTypes.length > 0 || eraFilter;

  if (!hasFilters) {
    return;  // API呼び出しをスキップ
  }

  // フィルターが適用されている場合のみAPIを呼ぶ
  const timer = setTimeout(() => {
    void applyFilters();
  }, 300);

  return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [filterTerm, selectedIconTypes.length, eraFilter]);
```

**変更ファイル**:
- `src/components/spot-explorer.tsx` (40行修正)
- `src/app/api/spots/route.ts` (1行削除)

---

### 修正結果

**動作確認**:
1. ✅ トップページで88件の公開スポットが表示される
2. ✅ 地図上にすべてのマーカーが表示される
3. ✅ スポット選択時に詳細情報が表示される
4. ✅ キーワード検索、カテゴリフィルター、時代フィルターが正常に動作
5. ✅ 不要なAPI呼び出しが削減され、パフォーマンスが向上

**データベース状態**:
```
Total spots: 88
Published spots: 88
Spots by status:
  PUBLISHED: 88
```

**APIエンドポイント動作確認**:
```bash
# フィルターなし（全スポット取得）
GET /api/spots? → 200 OK (88件)

# 詳細取得
GET /api/spots/[id] → 200 OK
```

---

### 技術的な学び

1. **Prismaスキーマの厳密性**:
   - Prismaは存在しないフィールドへのアクセスを実行時にエラーとして検出
   - スキーマ変更時は全コードを確認する必要がある

2. **APIレスポンス構造の統一**:
   - `jsonResponse()` ヘルパーが `{data: {...}}` 形式でラップしている
   - クライアント側でも一貫してこの構造を期待する必要がある

3. **Reactステート管理**:
   - `useEffect` の依存配列は慎重に設計する必要がある
   - 不要な再レンダリングや API 呼び出しを避けるため、フィルター条件の変化のみを監視

4. **bbox フィルターの課題**:
   - 地図範囲でのフィルターは UX として便利だが、初期表示時に混乱を招く可能性
   - 現在は全スポット表示に変更したが、将来的には「現在の地図範囲でフィルター」ボタンなどの明示的なUI実装を検討

---

**最終更新**: 2025-11-12
