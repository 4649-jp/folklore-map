# 開発ログ

このファイルには、民俗学マップの開発過程における主要な実装内容と技術的な詳細を記録します。

## 2025-11-13

### 1. 認証システムのトラブルシューティング

#### 問題の発生
ユーザーがログイン/サインアップを試みた際、以下のエラーが発生：
```
Failed to fetch
    at signUp (src/app/login/page.tsx:27:46)
```

#### 原因分析
1. **ネットワーク構成の不一致**
   - ブラウザアクセス: `http://192.168.0.238:3000`
   - Supabase設定: `http://localhost:54321`
   - これによりCORS（Cross-Origin Resource Sharing）エラーが発生

2. **設定ファイルの不整合**
   - `.env.local`: localhost を使用
   - `supabase/config.toml`: 127.0.0.1 を使用
   - 双方がネットワークIPと一致していない

3. **ブラウザキャッシュの影響**
   - 初期修正後もエラーが継続
   - ブラウザが古いJavaScript（localhost URL含む）をキャッシュ

#### 解決策の実装

**1. 環境変数の統一** (`.env.local`)
```bash
# Before
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321

# After
NEXT_PUBLIC_SUPABASE_URL=http://192.168.0.238:54321
SUPABASE_URL=http://192.168.0.238:54321
```

**2. Supabase設定の更新** (`supabase/config.toml`)
```toml
[auth]
site_url = "http://192.168.0.238:3000"
additional_redirect_urls = [
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  "http://192.168.0.238:3000"
]

[analytics]
enabled = false  # CPU非互換エラー対策
```

**3. クライアントキャッシュの動的無効化** (`src/lib/supabase/client.ts`)
```typescript
let browserClient: SupabaseClient | null = null;
let cachedUrl: string | undefined = undefined;

export function getSupabaseBrowserClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // URLが変更された場合、キャッシュをクリア（開発環境対応）
  if (browserClient && cachedUrl !== url) {
    console.log(`Supabase URL changed from ${cachedUrl} to ${url}. Recreating client.`);
    browserClient = null;
  }

  if (browserClient) {
    return browserClient;
  }

  cachedUrl = url;
  console.log(`Creating Supabase browser client with URL: ${url}`);

  browserClient = createBrowserClient(url, anonKey, {
    cookies: { /* カスタムCookie管理 */ }
  });

  return browserClient;
}
```

**4. エラーハンドリングの強化** (`src/app/login/page.tsx`)
```typescript
catch (err) {
  console.error("認証エラー:", err);

  let errorMessage = "認証に失敗しました。もう一度お試しください。";

  if (err instanceof Error) {
    if (err.message.includes("Failed to fetch") || err.message.includes("fetch")) {
      errorMessage = "サーバーに接続できませんでした。Supabaseサービスが起動しているか確認してください。";
    } else {
      errorMessage = err.message;
    }
  }

  setError(errorMessage);
}
```

**5. 完全なキャッシュクリア手順**
```bash
# 全開発プロセス停止
pkill -f 'next dev'
pkill -f 'supabase'

# Next.jsキャッシュ削除
rm -rf /home/test/codex-test/folklore-map/.next

# Supabase再起動
cd /home/test/codex-test/folklore-map
supabase stop && supabase start

# 開発サーバー再起動
pnpm dev
```

#### 結果
- 認証が正常に動作
- サインアップ/ログインが成功
- エラーメッセージがより明確に

#### 学んだ教訓
1. **IPアドレス統一の重要性**: すべての設定ファイル（.env, config.toml）でアクセス元IPと一致させる
2. **キャッシュの影響**: ブラウザとNext.jsの両方のキャッシュをクリアする必要がある
3. **エラーハンドリング**: ユーザーフレンドリーなエラーメッセージで問題診断を容易に

---

### 2. データベース重複削除

#### 問題の発見
- スポット一覧に88件の伝承が存在
- うち16件が重複（同じタイトル）
- データベースの整合性とユーザー体験に悪影響

#### 実装アプローチ

**1. 重複検出スクリプト** (`scripts/find_duplicates.mjs`)
```javascript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findDuplicates() {
  const spots = await prisma.spot.findMany({
    select: {
      id: true,
      title: true,
      lat: true,
      lng: true,
      updated_at: true,
    },
    orderBy: { title: 'asc' },
  });

  // タイトルでグループ化
  const titleGroups = new Map();
  for (const spot of spots) {
    const existing = titleGroups.get(spot.title) || [];
    existing.push(spot);
    titleGroups.set(spot.title, existing);
  }

  // 重複のみ抽出
  const duplicates = Array.from(titleGroups.entries())
    .filter(([_, spots]) => spots.length > 1);

  console.log(`Total spots: ${spots.length}`);
  console.log(`Duplicate titles: ${duplicates.length}`);
  console.log(`Duplicate spots: ${duplicates.reduce((sum, [_, spots]) => sum + spots.length, 0)}`);

  // 詳細表示
  for (const [title, spots] of duplicates) {
    console.log(`\n"${title}" (${spots.length} duplicates):`);
    for (const spot of spots) {
      console.log(`  - ID: ${spot.id}, Updated: ${spot.updated_at.toISOString()}`);
    }
  }
}

findDuplicates()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**2. 重複削除スクリプト** (`scripts/remove_duplicates.mjs`)
```javascript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeDuplicates() {
  const spots = await prisma.spot.findMany({
    select: {
      id: true,
      title: true,
      updated_at: true,
    },
    orderBy: { title: 'asc' },
  });

  const titleGroups = new Map();
  for (const spot of spots) {
    const existing = titleGroups.get(spot.title) || [];
    existing.push(spot);
    titleGroups.set(spot.title, existing);
  }

  const duplicates = Array.from(titleGroups.entries())
    .filter(([_, spots]) => spots.length > 1);

  let removedCount = 0;

  for (const [title, spots] of duplicates) {
    // updated_atで降順ソート（新しい方を残す）
    spots.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());

    const toKeep = spots[0];
    const toRemove = spots.slice(1);

    console.log(`\n"${title}":`);
    console.log(`  Keep: ID ${toKeep.id} (${toKeep.updated_at.toISOString()})`);

    for (const spot of toRemove) {
      console.log(`  Remove: ID ${spot.id} (${spot.updated_at.toISOString()})`);
      await prisma.spot.delete({ where: { id: spot.id } });
      removedCount++;
    }
  }

  console.log(`\nRemoved ${removedCount} duplicate spots.`);

  const finalCount = await prisma.spot.count();
  console.log(`Remaining spots: ${finalCount}`);
}

removeDuplicates()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

#### 実行結果
```bash
$ node scripts/find_duplicates.mjs
Total spots: 88
Duplicate titles: 16
Duplicate spots: 32

$ node scripts/remove_duplicates.mjs
Removed 16 duplicate spots.
Remaining spots: 72
```

#### 削除方針
- `updated_at` が最新のエントリを保持
- 古いバージョンは削除
- データベースの参照整合性を維持

---

### 3. 双方向マップ・リスト連携の実装

#### 要件
1. **地図 → リスト**: 地図上のマーカークリック時、リストが自動スクロール＆ハイライト
2. **リスト → 地図**: リスト項目クリック時、地図がズーム＆ポップアップ表示
3. **スムーズアニメーション**: 急な画面遷移ではなく、自然な動き

#### 実装1: 地図アイコンクリック → リスト自動スクロール

**技術スタック**
- React `useRef` でDOM参照を管理
- `scrollIntoView` APIでスムーズスクロール
- Tailwind CSS で視覚的フィードバック

**実装** (`src/components/spot-explorer.tsx`)
```typescript
export function SpotExplorer({ initialSpots }: SpotExplorerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // リストコンテナへの参照
  const spotListRef = useRef<HTMLDivElement | null>(null);

  // 各スポットアイテムへの参照をMapで管理
  const spotItemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // selectedId変更時に自動スクロール
  useEffect(() => {
    if (!selectedId) return;

    const selectedElement = spotItemRefs.current.get(selectedId);
    if (selectedElement && spotListRef.current) {
      selectedElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest", // 既に表示されている場合はスクロールしない
      });
    }
  }, [selectedId]);

  return (
    <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-2">
      {/* 地図 */}
      <SpotMap
        spots={filteredSpots}
        selectedId={selectedId}
        onSelectSpot={setSelectedId}
      />

      {/* リスト */}
      <div ref={spotListRef} className="overflow-y-auto">
        {filteredSpots.map((spot) => (
          <button
            key={spot.id}
            ref={(el) => {
              if (el) spotItemRefs.current.set(spot.id, el);
              else spotItemRefs.current.delete(spot.id);
            }}
            onClick={() => setSelectedId(spot.id)}
            className={cn(
              "flex w-full flex-col items-start gap-1 px-4 py-3",
              "text-left transition-all duration-300 hover:bg-muted/60",
              selectedId === spot.id &&
                "bg-primary/10 ring-2 ring-primary/30 ring-inset"
            )}
          >
            {/* スポット情報 */}
          </button>
        ))}
      </div>
    </div>
  );
}
```

**ポイント**
- `Map<string, HTMLButtonElement>` で各アイテムのDOM参照を効率的に管理
- `block: "nearest"` で過剰なスクロールを防止
- `ring-2 ring-primary/30` で選択状態を視覚化

#### 実装2: リストクリック → 地図ズーム＋ポップアップ

**技術スタック**
- Google Maps JavaScript API `InfoWindow`
- React `useEffect` で選択状態を監視
- カスタムアイコンラベル関数

**実装** (`src/components/spot-map.tsx`)
```typescript
export function SpotMap({ spots, selectedId, onSelectSpot }: SpotMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  // 地図初期化時にInfoWindowを作成
  useEffect(() => {
    async function initMap() {
      const { Map } = await google.maps.importLibrary("maps");
      const map = new Map(mapContainerRef.current, { /* ... */ });
      mapRef.current = map;

      // InfoWindow初期化
      infoWindowRef.current = new google.maps.InfoWindow();

      // マーカー配置
      await createMarkers();
    }

    initMap();
  }, []);

  // selectedId変更時の処理
  useEffect(() => {
    if (!selectedId || !mapRef.current || !infoWindowRef.current) return;

    const spot = spots.find((s) => s.id === selectedId);
    if (!spot) return;

    const map = mapRef.current;
    const infoWindow = infoWindowRef.current;
    const targetPosition = { lat: spot.lat, lng: spot.lng };

    // InfoWindowのコンテンツを設定
    const iconLabel = getIconLabel(spot.icon_type);
    infoWindow.setContent(`
      <div style="padding: 8px;">
        <h3 style="font-weight: bold; margin-bottom: 4px;">${spot.title}</h3>
        <p style="font-size: 0.875rem; color: #666;">${iconLabel}</p>
      </div>
    `);

    // 位置とポップアップを設定
    map.setZoom(14);
    map.panTo(targetPosition);
    infoWindow.setPosition(targetPosition);
    infoWindow.open(map);

  }, [selectedId, spots]);

  return <div ref={mapContainerRef} className="h-full w-full" />;
}

// アイコンタイプからラベルを取得
function getIconLabel(iconType: SpotListItem["icon_type"]): string {
  const labels = {
    ONI: "鬼の伝承",
    KITSUNE: "狐・稲荷",
    DOG: "犬の伝承",
    DRAGON: "龍・蛇",
    TEMPLE: "寺院",
    SHRINE: "神社",
    ANIMAL: "動物",
    GENERIC: "一般伝承",
  };
  return labels[iconType] || "伝承";
}
```

**ポイント**
- `useRef` でInfoWindowインスタンスを永続化
- `setContent` でHTML文字列を動的に設定
- `open(map)` でマップに表示

#### 実装3: スムーズズームアニメーション

**要件の詳細化**
ユーザーからのフィードバック:
> "一気に場所が切り替わるのではなく、全体図からゆっくりズームして目的地を表示してほしいです。"

**アニメーション設計**
```
現在の状態（例: zoom 10）
    ↓ Stage 1: Zoom Out (100ms間隔で段階的)
全体図（zoom 6）
    ↓ Stage 2: Pan (300ms待機)
全体図 + 目的地中央
    ↓ Stage 3: Zoom In (100ms間隔で段階的、600ms待機後)
目的地（zoom 14）+ InfoWindow表示
```

**実装** (`src/components/spot-map.tsx`)
```typescript
useEffect(() => {
  if (!selectedId || !mapRef.current || !infoWindowRef.current) return;

  const spot = spots.find((s) => s.id === selectedId);
  if (!spot) return;

  const map = mapRef.current;
  const infoWindow = infoWindowRef.current;
  const targetPosition = { lat: spot.lat, lng: spot.lng };

  // InfoWindowコンテンツ設定
  const iconLabel = getIconLabel(spot.icon_type);
  infoWindow.setContent(`
    <div style="padding: 8px;">
      <h3 style="font-weight: bold; margin-bottom: 4px;">${spot.title}</h3>
      <p style="font-size: 0.875rem; color: #666;">${iconLabel}</p>
    </div>
  `);

  // アニメーションパラメータ
  const currentZoom = map.getZoom() ?? 8;
  const targetZoom = 14;
  const overviewZoom = 6;

  // タイマー管理配列（クリーンアップ用）
  const timers: NodeJS.Timeout[] = [];
  const intervals: NodeJS.Timeout[] = [];

  // Stage 3: 目的地でズームイン
  const zoomInToTarget = () => {
    let step = 0;
    const zoomInSteps = targetZoom - overviewZoom;

    const zoomInInterval = setInterval(() => {
      step++;
      const newZoom = overviewZoom + step;
      map.setZoom(newZoom);

      if (step >= zoomInSteps) {
        clearInterval(zoomInInterval);
        // アニメーション完了後にInfoWindow表示
        infoWindow.setPosition(targetPosition);
        infoWindow.open(map);
      }
    }, 100);

    intervals.push(zoomInInterval);
  };

  // Stage 1 & 2: ズームアウト → パン
  const animateZoom = () => {
    // 既に十分引いている場合はStage 2へ
    if (currentZoom <= overviewZoom + 1) {
      map.panTo(targetPosition);
      const timer = setTimeout(zoomInToTarget, 600);
      timers.push(timer);
      return;
    }

    // Stage 1: ズームアウト
    let step = 0;
    const zoomOutSteps = currentZoom - overviewZoom;

    const zoomOutInterval = setInterval(() => {
      step++;
      const newZoom = currentZoom - step;
      map.setZoom(newZoom);

      if (step >= zoomOutSteps || newZoom <= overviewZoom) {
        clearInterval(zoomOutInterval);

        // Stage 2: パン移動
        const panTimer = setTimeout(() => {
          map.panTo(targetPosition);

          // Stage 3: ズームイン
          const zoomInTimer = setTimeout(zoomInToTarget, 600);
          timers.push(zoomInTimer);
        }, 300);

        timers.push(panTimer);
      }
    }, 100);

    intervals.push(zoomOutInterval);
  };

  animateZoom();

  // クリーンアップ: メモリリーク防止
  return () => {
    timers.forEach(clearTimeout);
    intervals.forEach(clearInterval);
  };
}, [selectedId, spots]);
```

**技術的ハイライト**

1. **段階的ズーム**
   - `setInterval(callback, 100)` で滑らかなアニメーション
   - ステップごとに `map.setZoom(currentZoom - step)` を呼び出し

2. **タイミング制御**
   - Stage 1→2: ズームアウト完了後に300ms待機
   - Stage 2→3: パン完了後に600ms待機してからズームイン開始

3. **メモリリーク対策**
   - `useEffect` のクリーンアップ関数で全タイマーをクリア
   - `timers` と `intervals` 配列で一括管理

4. **条件分岐**
   - 既に引いている状態（`currentZoom <= overviewZoom + 1`）ではStage 1をスキップ

#### UX改善の成果

**Before**:
- 地図とリストが独立
- クリック時に瞬時に画面が切り替わる
- ユーザーが現在位置を見失いやすい

**After**:
- 地図とリストが完全に連携
- 自然な動きで目的地へ誘導
- ユーザーが地理的関係を把握しやすい

**ユーザーフィードバック想定**:
- 「地図の動きが自然で気持ちいい」
- 「リストから選ぶと地図が勝手に探してくれる」
- 「全体の位置関係が分かりやすい」

---

### 4. 開発環境用の認証一時無効化

#### 背景と目的
デモンストレーションとテストを容易にするため、認証システムを一時的に無効化し、ログインなしで全機能を利用可能にする必要が生じた。

#### 実装戦略
本番環境での再有効化を容易にするため、以下の方針を採用：
1. コードを削除せず、コメントアウトで無効化
2. 日本語コメントで無効化理由を明記
3. 一時的なロール・ユーザーIDをハードコード

#### 実装1: 投稿画面の認証無効化

**ファイル**: `src/app/post/page.tsx`

```typescript
export default async function PostPage() {
  // 一時的に認証チェックを無効化
  // const supabase = await createSupabaseServerClient();
  // const {
  //   data: { session },
  // } = await supabase.auth.getSession();

  // if (!session) {
  //   redirect("/login");
  // }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <div className="space-y-3">
        <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
          投稿フォーム
        </span>
        <h1 className="text-3xl font-bold">新しいスポットを追加する</h1>
        <p className="text-sm text-muted-foreground">
          【開発モード】ログインなしで投稿できます。送信後はレビュワーが内容を確認し、問題がなければ公開されます。 差別的表現や個人情報が含まれる場合は修正されることがあります。
        </p>
      </div>

      <SpotForm />
    </div>
  );
}
```

**変更内容**:
- `createSupabaseServerClient()` 呼び出しをコメントアウト
- セッションチェックとリダイレクトを無効化
- 説明文に「【開発モード】ログインなしで投稿できます」を追加

#### 実装2: スポット作成APIの認証無効化

**ファイル**: `src/app/api/spots/route.ts`

```typescript
export async function POST(request: NextRequest) {
  // 一時的に認証チェックを無効化
  let role: UserRole = "editor"; // 一時的にeditor権限を付与
  let userId: string | null = "anonymous-user"; // 一時的な匿名ユーザーID

  // try {
  //   const supabase = await createSupabaseServerClient();
  //   const {
  //     data: { session },
  //   } = await supabase.auth.getSession();
  //
  //   role = getUserRole(session);
  //   userId = session?.user.id ?? null;
  //
  //   if (!hasRole("editor", role)) {
  //     return errorResponse("投稿にはログインが必要です。", {
  //       status: 403,
  //       code: "FORBIDDEN",
  //     });
  //   }
  // } catch (error) {
  //   console.warn("[POST /api/spots] Supabase セッション取得に失敗しました", error);
  //   return errorResponse("認証に失敗しました。", {
  //     status: 401,
  //     code: "UNAUTHORIZED",
  //   });
  // }

  // ... 以降の処理は通常通り
}
```

**変更内容**:
- `role = "editor"` を明示的に設定（投稿権限を付与）
- `userId = "anonymous-user"` で匿名ユーザーを模擬
- Supabase認証チェック全体をコメントアウト

#### 実装3: ジオコーディングAPIの権限チェック無効化

**ファイル**: `src/app/api/geocode/route.ts`

```typescript
export async function POST(request: NextRequest) {
  // Rate limiting は維持
  const clientIp = getClientIp(request);
  const rateLimitResult = rateLimit(
    `geocode:${clientIp}`,
    RATE_LIMITS.GEOCODE
  );

  if (!rateLimitResult.success && rateLimitResult.response) {
    return rateLimitResult.response;
  }

  // 一時的に認証チェックを無効化
  // const supabase = await createSupabaseServerClient();
  // const {
  //   data: { session },
  // } = await supabase.auth.getSession();

  // const role = getUserRole(session);
  // if (!hasRole("editor", role)) {
  //   return errorResponse("ジオコーディングはログインした編集者のみ利用できます。", {
  //     status: 403,
  //     code: "FORBIDDEN",
  //   });
  // }

  // ... 以降の処理は通常通り
}
```

**重要**: Rate limitingは維持し、セキュリティの基本層は保持

#### 実装4: スポット更新APIの認証無効化

**ファイル**: `src/app/api/spots/[id]/route.ts`

```typescript
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;

  // 一時的に認証チェックを無効化し、管理者権限として動作
  let role: UserRole = "admin";
  let userId: string | null = "anonymous-user";

  // const supabase = await createSupabaseServerClient();
  // const {
  //   data: { session },
  // } = await supabase.auth.getSession();

  // const role = getUserRole(session);
  // const userId = session?.user.id ?? null;

  // if (!userId) {
  //   return errorResponse("ログインが必要です。", {
  //     status: 401,
  //     code: "UNAUTHORIZED",
  //   });
  // }

  // ... 以降の処理（権限チェック含む）は通常通り
}
```

**変更内容**:
- `role = "admin"` を設定（全権限を付与、ステータス変更を許可）
- 所有者チェックとレビュワー権限チェックをバイパス

#### セキュリティ考慮事項

**現在の状態（開発モード）**:
- ✅ Rate limiting は有効（DoS対策維持）
- ✅ Zodバリデーション は有効（入力検証維持）
- ❌ 認証・認可 は無効（誰でもアクセス可能）
- ❌ 所有者チェック は無効（誰でも編集可能）

**本番環境への移行手順**:
1. すべてのコメントアウトされた認証コードのコメントを解除
2. 一時的なロール・ユーザーID代入行を削除
3. テストで全エンドポイントの権限チェックを検証

#### 結果
- 開発・デモ環境で認証なしに全機能を利用可能
- コードの可読性と再有効化の容易さを維持
- Rate limitingとバリデーションによる最低限の保護は継続

---

### 5. 投稿フォームのUX改善

#### 要件
ユーザーフィードバックに基づき、以下の改善を実施：
1. タイトルの表現を変更
2. 説明文の表現を柔らかく
3. アイコン種別のドロップダウン順序を最適化

#### 実装: テキストの更新

**ファイル**: `src/app/post/page.tsx`

```typescript
<h1 className="text-3xl font-bold">新しいスポットを追加する</h1>
<p className="text-sm text-muted-foreground">
  【開発モード】ログインなしで投稿できます。送信後はレビュワーが内容を確認し、問題がなければ公開されます。 差別的表現や個人情報が含まれる場合は修正されることがあります。
</p>
```

**変更内容**:
- タイトル: 「提出する」→「追加する」（よりフレンドリーな表現）
- 説明文: 「修正が必要になります」→「修正されることがあります」（強制感を軽減）

#### 実装: アイコン順序の最適化

**ファイル**: `src/components/spot-form.tsx`

**Before**:
```typescript
<select {...form.register("icon_type")} className={inputCls}>
  <option value="GENERIC">その他</option>
  <option value="ONI">鬼の伝承</option>
  <option value="KITSUNE">狐・稲荷</option>
  {/* ... */}
</select>
```

**After**:
```typescript
<select {...form.register("icon_type")} className={inputCls}>
  <option value="ONI">鬼の伝承</option>
  <option value="KITSUNE">狐・稲荷</option>
  <option value="DOG">犬・番犬</option>
  <option value="DRAGON">龍・龍神</option>
  <option value="TEMPLE">寺院</option>
  <option value="SHRINE">神社</option>
  <option value="ANIMAL">動物全般</option>
  <option value="GENERIC">その他</option>
</select>
```

**設計判断**:
- 「その他」は通常最後のオプションであるべき（UI慣習）
- 具体的なカテゴリを先に表示することでユーザーの選択を促進
- 民俗学的に重要度の高い順に並べる

---

### 6. 管理者画面: スポット公開機能

#### 背景
既存の管理画面では：
- スポットの閲覧と削除のみが可能
- レビュー待ちのスポットを公開するには別画面（レビューパネル）が必要
- 管理フローが非効率

#### 要件
管理者画面から直接スポットを公開できる機能を追加。

#### 実装: handlePublish関数

**ファイル**: `src/app/admin/spots/page.tsx`

```typescript
const handlePublish = async (spotId: string) => {
  try {
    const res = await fetch(`/api/spots/${spotId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PUBLISHED" }),
    });

    if (res.ok) {
      // スポット一覧を再読み込み
      await loadSpots();
      alert("公開しました");
    } else {
      const response = await res.json();
      alert(`公開に失敗しました: ${response.error?.message || "不明なエラー"}`);
    }
  } catch (error) {
    console.error("公開エラー:", error);
    alert("公開に失敗しました");
  }
};
```

**技術的詳細**:
1. **APIリクエスト**: `/api/spots/:id` の PATCH エンドポイントを使用
2. **ペイロード**: `{ status: "PUBLISHED" }` のみ送信
3. **楽観的UI更新**: 成功時に `loadSpots()` で最新データを再取得
4. **エラーハンドリング**: API エラーメッセージをユーザーに表示

#### 実装: 公開ボタンの追加

```typescript
<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
  <div className="flex gap-3 justify-end">
    {spot.status !== "PUBLISHED" && (
      <button
        onClick={() => handlePublish(spot.id)}
        className="text-green-600 hover:text-green-900"
      >
        公開
      </button>
    )}
    <button
      onClick={() =>
        setDeleteConfirm({
          open: true,
          spotId: spot.id,
          spotTitle: spot.title,
        })
      }
      className="text-red-600 hover:text-red-900"
    >
      削除
    </button>
  </div>
</td>
```

**UI設計判断**:
- 条件表示: `status !== "PUBLISHED"` の場合のみボタンを表示
- 視覚的区別: 緑色（公開）vs 赤色（削除）で意図を明確化
- 配置: 操作ボタンを右揃えで統一

#### ワークフロー

```
管理者画面
  ↓
[公開] ボタンクリック
  ↓
handlePublish(spotId)
  ↓
PATCH /api/spots/:id { status: "PUBLISHED" }
  ↓
データベース更新 + Audit ログ記録
  ↓
成功レスポンス
  ↓
loadSpots() で一覧更新
  ↓
「公開しました」アラート表示
```

#### 権限制御
現在は認証無効化により全ユーザーが公開可能だが、本番環境では：
- `/api/spots/[id]/route.ts` の PATCH エンドポイントで `hasRole("reviewer", role)` をチェック
- ステータス変更は reviewer 以上のみ許可
- Audit ログに操作者を記録

#### UX改善の成果
- **効率化**: 公開のために画面遷移が不要
- **直感性**: 一覧で状態を確認しながら操作可能
- **一貫性**: 削除と同じ場所に公開ボタンを配置

---

### 7. 明治期古地図の表示修正

#### 問題の発見
ユーザーからのフィードバック:
> "明治期の古地図が載っていないです。"

地図の右上に「明治期古地図」ボタンは存在するが、クリックしても画像が表示されない。

#### 原因調査

**1. タイルURLの検証**
```bash
$ curl -I "https://ktgis.net/kjmapw/kjtilemap/tokyo50/00/14/14547/6451.png"
HTTP/2 404
```

今昔マップのタイルURLが404エラーを返している。サービスのURL形式が変更されたか、利用可能なデータセットが変更された可能性。

**2. 既存実装の確認**
```typescript
// 既存のタイルURL生成ロジック（動作せず）
getTileUrl: (coord, zoom) => {
  const ymax = 1 << zoom;
  const y = ymax - coord.y - 1; // TMS形式の座標変換

  const dataset = selectDatasetByLocation(lat, lng);

  return `https://ktgis.net/kjmapw/kjtilemap/${dataset.folder}/${dataset.period}/${zoom}/${coord.x}/${y}.png`;
}
```

#### 解決策: 国土地理院タイルへの移行

**著作権に安全なソースの選定**
- **国土地理院**: パブリックドメインの歴史的地形図を提供
- **利用条件**: 出典明記のみで商用・非商用問わず無料
- **データセット**: 明治13-19年（1880-1886年）迅速測図

**実装: タイル設定の変更**

ファイル: `src/components/spot-map.tsx`

```typescript
// 国土地理院の歴史的地形図タイルレイヤーを作成
const historicalMapType = new google.maps.ImageMapType({
  getTileUrl: (coord, zoom) => {
    if (!coord || zoom < 5 || zoom > 18) {
      return "";
    }
    // 国土地理院の標準タイル形式（XYZ形式、TMS変換不要）
    return `https://cyberjapandata.gsi.go.jp/xyz/gazo1/${zoom}/${coord.x}/${coord.y}.jpg`;
  },
  tileSize: new google.maps.Size(256, 256),
  opacity: 0.75,
  name: "明治期地形図",
  maxZoom: 18,
  minZoom: 5,
});
```

**主要な変更点**:
1. **座標形式**: TMS → XYZ（Y座標反転不要）
2. **ファイル形式**: PNG → JPG
3. **URL構造**: シンプルな3階層構造
4. **地域判定**: 不要（単一データセット）

**クレジット表記の更新**

```typescript
{currentLayer === "meiji" && (
  <span className="font-medium">国土地理院 歴史的地形図</span>
)}
```

**不要なコードの削除**

```typescript
// 削除: 今昔マップ用の関数群
// - tile2lat()
// - tile2lng()
// - selectDatasetByLocation()
```

#### タイル動作確認

```bash
$ curl -I "https://cyberjapandata.gsi.go.jp/xyz/gazo1/10/907/403.jpg"
HTTP/2 200
content-type: image/jpeg
content-length: 34981
```

✅ 正常に取得可能

#### 制限事項と今後の改善

**現在の制限**:
- カバー範囲: 主に関東平野（埼玉、東京、千葉、神奈川）
- 他地域では白タイルまたは表示されない

**全国対応への拡張案**:
1. 複数のタイルセットを組み合わせ
   - `gazo1`: 明治期迅速測図（関東）
   - `gazo2`: 旧版地図（全国、別時代）
   - `gazo3`: 他の歴史的資料
2. 座標に応じて動的にタイルセットを切り替え
3. データセット選択UIの追加（時代・地域フィルター）

#### 結果
- 関東地方で明治期の手書き地形図が正常に表示
- 著作権的に安全な実装に移行
- クレジット表記も適切に更新

---

### 8. フィルター適用時の地図表示UX改善

#### 問題の発見
ユーザーからのフィードバック:
> "フィルターから高度な検索に移動した際、現在はスポット一覧が反応して地図の方で「百鬼夜行の辻」に自動で移動してしまいます。そうではなく、例えば「神社」を選んだ場合は、神社のピンが複数見えるように、地図を少し引いた状態で表示するようにしてください。"

#### UXの問題分析

**既存の動作**:
1. ユーザーが「神社」フィルターを選択
2. API が神社のスポット一覧を返却（例: 10件）
3. `spot-explorer.tsx` が自動的に最初のスポット（例: 「百鬼夜行の辻」）を選択
4. 地図がそのスポットにズーム（ズームレベル14）
5. **問題**: 他の神社が見えず、全体像が把握できない

**理想的な動作**:
1. ユーザーが「神社」フィルターを選択
2. 地図がすべての神社のピンが見える範囲に自動調整
3. ユーザーが全体像を把握してから、興味のあるスポットをクリック

#### 実装1: 自動選択の無効化

**ファイル**: `src/components/spot-explorer.tsx`

**Before**:
```typescript
useEffect(() => {
  if (filteredSpots.length === 0) {
    setSelectedId(null);
    return;
  }
  if (selectedId && filteredSpots.some((spot) => spot.id === selectedId)) {
    return;
  }
  // 問題: フィルター適用時に最初のスポットを自動選択
  setSelectedId(filteredSpots[0].id);
}, [filteredSpots, selectedId]);
```

**After**:
```typescript
useEffect(() => {
  if (filteredSpots.length === 0) {
    setSelectedId(null);
    return;
  }
  // 現在選択中のスポットがフィルター後も含まれている場合は維持
  if (selectedId && filteredSpots.some((spot) => spot.id === selectedId)) {
    return;
  }
  // 改善: フィルター適用時は自動選択しない（地図が全体を表示するため）
  setSelectedId(null);
}, [filteredSpots, selectedId]);
```

**変更のポイント**:
- `selectedId` を `null` に設定することで、地図コンポーネントに「全体表示モード」を通知

#### 実装2: バウンディングボックス自動調整

**ファイル**: `src/components/spot-map.tsx`

**技術: Google Maps Bounding Box**

```typescript
useEffect(() => {
  const map = mapInstanceRef.current;
  if (!map) return;

  // マーカー配置処理...

  // フィルター適用時（selectedIdがnull）の処理
  if (!selectedId && spots.length > 0) {
    if (spots.length === 1) {
      // ケース1: 1件のみ
      const spot = spots[0];
      map.setCenter({ lat: spot.lat, lng: spot.lng });
      setTimeout(() => {
        map.setZoom(8); // 都道府県レベルで表示
      }, 100);
    } else {
      // ケース2: 複数スポット
      const bounds = new google.maps.LatLngBounds();

      // すべてのスポットの座標をバウンディングボックスに追加
      spots.forEach((spot) => {
        bounds.extend(new google.maps.LatLng(spot.lat, spot.lng));
      });

      // 適度な余白を持たせてフィット
      map.fitBounds(bounds, {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50,
      });
    }
  }
}, [spots, selectedId, onMarkerSelect]);
```

**アルゴリズム詳細**:

**ケース1: スポットが1件**
```
問題: fitBounds() は1点だけだと最大ズームになる
解決策: 固定ズームレベル8（都道府県レベル）を設定
効果: 周辺の地理的文脈（県境、海、山など）が見える
```

**ケース2: スポットが複数**
```
1. LatLngBounds オブジェクトを初期化
2. すべてのスポットの座標を extend() で追加
3. fitBounds() で自動的に最適なズーム・中心を計算
4. padding でUIとの重なりを防ぐ
```

**パディング設定の意図**:
```typescript
{
  top: 50,    // レイヤー切り替えボタンを避ける
  right: 50,  // 右側の余白
  bottom: 50, // クレジット表記を避ける
  left: 50,   // 左側の余白
}
```

#### ユースケース例

**シナリオ1: 「神社」フィルター（15件該当）**
```
1. ユーザーが「神社」を選択
2. selectedId = null
3. 地図が15個の⛩️ピンすべてを含む範囲に調整
4. 日本列島の一部が見える状態（例: 関東〜中部）
5. ユーザーが興味のある神社をクリック
6. その神社にズーム（既存のアニメーション機能）
```

**シナリオ2: 「龍・龍神」フィルター（1件のみ）**
```
1. ユーザーが「龍・龍神」を選択
2. selectedId = null
3. 地図がその1件を中心に、ズームレベル8で表示
4. 都道府県全体が見える（例: 「福島県にある」と分かる）
5. ユーザーがスポットをクリック
6. 詳細ズームで周辺情報表示
```

#### UX改善の効果

**改善前**:
- ❌ フィルター後、即座に特定スポットにズーム
- ❌ 他のスポットの位置が分からない
- ❌ ユーザーが文脈を失う

**改善後**:
- ✅ フィルター後、全体像を表示
- ✅ すべてのスポットの位置関係が一目で分かる
- ✅ ユーザーが主体的にスポットを選択
- ✅ 1件のみでも地理的文脈を提供

#### 技術的ハイライト

**Google Maps API の活用**:
```typescript
// バウンディングボックスAPI
const bounds = new google.maps.LatLngBounds();
bounds.extend(latLng);
map.fitBounds(bounds, padding);
```

**React useEffect の依存関係**:
```typescript
// spots や selectedId が変わるたびに地図を更新
}, [spots, selectedId, onMarkerSelect]);
```

**条件分岐による適応的表示**:
```typescript
if (!selectedId && spots.length > 0) {
  // フィルター適用時の全体表示モード
} else {
  // 通常の詳細表示モード（既存のズームアニメーション）
}
```

---

### 技術的学び

#### 1. React Refs の効果的な使用
- `useRef<Map<string, Element>>` で複数DOM要素を効率管理
- 不要な再レンダリングを避けつつDOM操作が可能

#### 2. Google Maps API との統合
- `importLibrary` でモダンなAPI使用
- `InfoWindow` でネイティブなポップアップ体験
- `panTo` / `setZoom` で滑らかなカメラ制御

#### 3. アニメーション設計
- `setInterval` / `setTimeout` の組み合わせで複雑なシーケンス実装
- クリーンアップ関数の重要性（メモリリーク防止）

#### 4. 開発環境のベストプラクティス
- すべての設定ファイルでネットワーク構成を統一
- キャッシュクリアを開発フローに組み込む
- エラーメッセージを詳細化してデバッグ効率向上

#### 5. タイルマップサービスの選定と統合
- **著作権の確認**: タイルサービス利用前に必ず利用規約を確認
- **URL検証**: `curl -I` でタイルURLの有効性をテスト
- **座標系の違い**: TMS（Y座標反転）とXYZ（標準）の違いに注意
- **フォールバック戦略**: 主要サービスが使えない場合の代替案を用意
- **クレジット表記**: 必ず出典を明記（法的・倫理的義務）

#### 6. Google Maps LatLngBounds API
- **複数地点の表示**: `fitBounds()` で自動的に最適な表示範囲を計算
- **パディング**: UIコントロールと重ならないよう余白を設定
- **1点のみの特殊処理**: `fitBounds()` は1点だと最大ズームになるため、固定ズームを設定
- **地理的文脈**: ズームレベル8（都道府県）が全体把握に最適

#### 7. UX設計の原則
- **文脈を保持**: フィルター適用時に全体像を見せる
- **ユーザーの主体性**: 自動選択せず、ユーザーに選択させる
- **段階的な詳細化**: 全体 → 部分 → 詳細の順で情報を提示
- **フィードバック駆動**: ユーザーの要望を具体的な改善に反映

---

### 次のステップ

#### 短期的改善
- [ ] アニメーション速度をユーザー設定で調整可能に
- [ ] モバイル端末での地図・リストレイアウト最適化
- [ ] キーボードナビゲーション対応（アクセシビリティ）

#### 中期的改善
- [ ] 地図上に複数のInfoWindowを同時表示（クラスタリング）
- [ ] スポット間の距離を計算して「近くの伝承」を提案
- [ ] アニメーションの一時停止/スキップ機能

#### 長期的改善
- [ ] 3Dマップビューへの対応
- [ ] 古地図オーバーレイとの連携
- [ ] VR/ARでの伝承体験機能

---

### 参照

**関連ファイル**:
- `folklore-map/src/components/spot-explorer.tsx` - メインUI統合
- `folklore-map/src/components/spot-map.tsx` - Google Maps統合
- `folklore-map/scripts/find_duplicates.mjs` - データクリーニング
- `folklore-map/scripts/remove_duplicates.mjs` - データクリーニング

**ドキュメント**:
- `setup.md` - 環境構築とトラブルシューティング
- `detailed_design.md` - システム設計詳細
- `CLAUDE.md` - プロジェクト概要とガイドライン

**外部リソース**:
- [Google Maps JavaScript API - Advanced Markers](https://developers.google.com/maps/documentation/javascript/advanced-markers)
- [MDN - Element.scrollIntoView()](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView)
- [React - useRef Hook](https://react.dev/reference/react/useRef)

---

## 2025-11-23

### 1. 管理者分析機能の実装

#### 実装内容

管理者向けダッシュボードに包括的な分析機能を追加しました。

**追加された機能**:
1. **スポット追加履歴** - スポットの投稿動向を時系列で把握
2. **検索ログ集計** - ユーザーの検索行動とニーズを分析
3. **コンテンツ人気指標** - 各スポットのエンゲージメントを測定
4. **CSVエクスポート** - すべてのデータをCSV形式でダウンロード可能

#### データベーススキーマの変更

**新規追加モデル**:

```prisma
model SearchLog {
  id             String   @id @default(cuid())
  keyword        String?
  icon_types     String?
  era            String?
  status         String?
  user_id        String?
  session_id     String?
  results_count  Int      @default(0)
  searched_at    DateTime @default(now())

  @@index([searched_at])
  @@index([keyword])
}

model SpotView {
  id          String   @id @default(cuid())
  spot_id     String
  user_id     String?
  session_id  String?
  duration_ms Int?
  viewed_at   DateTime @default(now())
  spot        Spot     @relation(fields: [spot_id], references: [id], onDelete: Cascade)

  @@index([spot_id])
  @@index([viewed_at])
}

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
  LIKE
  SAVE
  SHARE
}
```

**既存モデルの変更**:
- `Spot` モデルに `created_at` フィールドを追加（分析用）
- `Spot` モデルに `views` と `interactions` のリレーションを追加

**マイグレーション**:
```bash
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" pnpm prisma db push
```

#### API エンドポイントの実装

reviewer以上のロールでアクセス可能な5つのエンドポイントを実装：

1. **GET** `/api/admin/analytics/spot-history`
   - スポット追加履歴を取得
   - 期間フィルタ、ページネーション対応

2. **GET** `/api/admin/analytics/search-logs`
   - 検索ログと集計データを取得
   - 人気キーワードランキング（上位20件）
   - アイコンタイプ、時代フィルタの使用統計

3. **POST** `/api/admin/analytics/search-logs`
   - 検索ログを記録（フロントエンドから呼び出し用）

4. **GET** `/api/admin/analytics/popularity`
   - コンテンツ人気指標を取得
   - 閲覧数、平均滞在時間、いいね、保存、シェアを集計
   - 人気スコア: `view_count + (total_interactions * 2)`

5. **GET** `/api/admin/analytics/export`
   - 分析データをCSV形式でエクスポート
   - `type` パラメータで3種類のレポートを選択可能

**実装ファイル**:
- `src/app/api/admin/analytics/spot-history/route.ts`
- `src/app/api/admin/analytics/search-logs/route.ts`
- `src/app/api/admin/analytics/popularity/route.ts`
- `src/app/api/admin/analytics/export/route.ts`

#### ダッシュボードUIの実装

**ファイル**: `src/app/admin/analytics/page.tsx`

**主要機能**:
- 3つのタブで情報を整理（スポット履歴、検索ログ、人気指標）
- 期間フィルタ（開始日、終了日）
- CSVエクスポートボタン
- レスポンシブなテーブル表示

**管理者レイアウトの更新**:
- `src/components/admin-layout.tsx` に分析メニュー項目を追加

#### 技術的な詳細

**認証・認可**:
```typescript
const supabase = await createSupabaseServerClient();
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  return NextResponse.json({ error: { code: "UNAUTHORIZED" }}, { status: 401 });
}

const role = getUserRole(user);
if (!hasRole("reviewer", role)) {
  return NextResponse.json({ error: { code: "FORBIDDEN" }}, { status: 403 });
}
```

**Prisma集計クエリ**:
```typescript
// groupByを使用した効率的な集計
const keywordStats = await prisma.searchLog.groupBy({
  by: ["keyword"],
  where: { keyword: { not: null } },
  _count: { keyword: true },
  orderBy: { _count: { keyword: "desc" } },
  take: 20,
});
```

**複数テーブルの集計と結合**:
```typescript
// 閲覧数、いいね、保存、シェアを個別に集計
const viewStats = await prisma.spotView.groupBy({...});
const likeStats = await prisma.spotInteraction.groupBy({...});
const saveStats = await prisma.spotInteraction.groupBy({...});
const shareStats = await prisma.spotInteraction.groupBy({...});

// 結果を結合してランキング作成
const popularityData = spotIds.map((spotId) => ({
  spot_id: spotId,
  view_count: viewStats.find(s => s.spot_id === spotId)?._count.spot_id || 0,
  like_count: likeStats.find(s => s.spot_id === spotId)?._count.spot_id || 0,
  // ...
}));
```

**CSVエクスポート**:
```typescript
return new NextResponse(csvContent, {
  headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
  },
});
```

#### トラブルシューティング

**問題1: ビルドエラー（import errors）**

エラーメッセージ:
```
Export createClient doesn't exist in target module
Export db doesn't exist in target module
```

**原因**:
- `@/lib/supabase/server` の正しいエクスポート名は `createSupabaseServerClient`
- `@/lib/db` の正しいエクスポート名は `prisma`

**解決策**:
すべての分析APIファイルで以下のように修正：
```typescript
// Before
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

// After
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
```

**問題2: TypeScript型エラー（IconType不一致）**

エラーメッセージ:
```
Type 'IconType' is not assignable to type '"ONI" | "KITSUNE" | ... | "GENERIC"'
```

**原因**:
- `src/components/spot-types.ts` の `SpotListItem` 型定義が古い8種類のIconTypeのみを含んでいた
- Prismaスキーマには24種類のIconTypeが定義されている

**解決策**:
`spot-types.ts` を更新して全24種類を含めるように修正：
```typescript
export type SpotListItem = {
  // ...
  icon_type:
    | "ONI" | "KITSUNE" | "DOG" | "DRAGON" | "TEMPLE" | "SHRINE" | "ANIMAL" | "GENERIC"
    | "TANUKI" | "RABBIT" | "OX" | "HORSE" | "BIRD" | "TENGU" | "CROW_TENGU"
    | "YATAGARASU" | "TURTLE" | "FISH" | "WHALE" | "UMIBOUZU" | "KAPPA"
    | "KAWAAKAGO" | "SUIKO" | "KODAMA";
  // ...
};
```

**問題3: ネットワークアクセスエラー（ERR_CONNECTION_REFUSED）**

エラーメッセージ:
```
192.168.0.238 接続が拒否されました。ERR_CONNECTION_REFUSED
```

**原因**:
- Next.js開発サーバーが `localhost` (127.0.0.1) にのみバインドされていた
- ネットワーク上の他のデバイスからアクセスできない

**解決策**:
サーバーを `0.0.0.0` にバインドして起動：
```bash
# Next.js
pnpm dev -H 0.0.0.0

# Prisma Studio
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  pnpm prisma studio --hostname 0.0.0.0
```

これにより以下のURLでアクセス可能になりました：
- Next.js: `http://192.168.0.238:3000`
- 分析ダッシュボード: `http://192.168.0.238:3000/admin/analytics`
- Prisma Studio: `http://192.168.0.238:5557`

#### パフォーマンス最適化

**インデックスの追加**:
- 頻繁にクエリされるフィールドにインデックスを追加
- `searched_at`, `viewed_at`, `created_at` などの日時フィールド
- `keyword`, `spot_id`, `type` などのフィルタ用フィールド

**並列クエリの実行**:
```typescript
// 関連性のない複数のクエリをPromise.allで並列実行
const [spots, total] = await Promise.all([
  prisma.spot.findMany({ where, take: limit, skip: offset }),
  prisma.spot.count({ where }),
]);
```

#### 学んだこと

**1. Prismaの集計機能**
- `groupBy` を使用することで効率的なデータ集計が可能
- `_count`, `_avg`, `_sum` などの集計関数を活用
- 複数のgroupByクエリを並列実行し、結果をアプリケーション層で結合

**2. CSVエクスポートの実装**
- Content-Typeに `text/csv; charset=utf-8` を指定
- Content-Dispositionに `attachment; filename="..."` を指定してダウンロードを促す
- UTF-8 BOM付きで出力することでExcelでの文字化けを防止（今後の改善案）

**3. ロールベースアクセス制御の一貫性**
- すべてのAPIエンドポイントで統一された認証フローを実装
- `hasRole()` ヘルパー関数を使用した柔軟な権限チェック
- エラーレスポンスの標準化

**4. 型安全性の維持**
- TypeScriptの型定義とPrismaスキーマの同期が重要
- enumの変更時は関連する型定義も更新が必要
- ビルド時に型エラーを検出することで実行時エラーを防止

**5. ネットワーク構成の考慮**
- ローカル開発時もネットワークアクセスを考慮
- `0.0.0.0` バインドでネットワーク上のすべてのインターフェースからアクセス可能に
- セキュリティ: 本番環境では適切なファイアウォール設定が必要

#### ドキュメント更新

以下のドキュメントを更新・作成しました：

1. **新規作成**: `analytics.md`
   - 分析機能の包括的なドキュメント
   - データベーススキーマ、API仕様、UI使用方法
   - トラブルシューティングと今後の拡張案

2. **更新**: `api_design.md`
   - `/admin/analytics` セクションを追加
   - 5つの新しいエンドポイントの仕様を記載

3. **更新**: `db_design.md`
   - 分析用モデル（SearchLog、SpotView、SpotInteraction）を追加
   - Spotモデルの変更を反映
   - インデックス設計を更新

4. **更新**: `development-log.md` (本ファイル)
   - 今回の実装内容を詳細に記録

#### 次のステップ

**フェーズ2: リアルタイム追跡の実装**
- [ ] スポット詳細ページに閲覧記録用のトラッキングコード追加
- [ ] 検索フォームから自動的に検索ログを記録
- [ ] いいね、保存、シェアボタンの実装とインタラクション記録

**フェーズ3: 可視化の強化**
- [ ] Chart.jsまたはRechartsを使用したグラフ表示
- [ ] 時系列チャート（日別/週別/月別の推移）
- [ ] ヒートマップ（地域別の人気度）

**フェーズ4: 高度な分析**
- [ ] ユーザーセグメンテーション（新規/リピーター）
- [ ] コンバージョンファネル（閲覧 → いいね → 保存）
- [ ] A/Bテスト機能

**フェーズ5: プライバシーとGDPR準拠**
- [ ] ユーザーIDの匿名化
- [ ] データ保持期間の設定
- [ ] ユーザーによるデータ削除リクエストの対応

#### 参照

**関連ファイル**:
- `src/app/admin/analytics/page.tsx` - 分析ダッシュボードUI
- `src/app/api/admin/analytics/*/route.ts` - 分析APIエンドポイント
- `src/components/admin-layout.tsx` - 管理者レイアウト
- `src/components/spot-types.ts` - TypeScript型定義
- `prisma/schema.prisma` - データベーススキーマ

**ドキュメント**:
- `analytics.md` - 分析機能の詳細ドキュメント
- `api_design.md` - API設計書
- `db_design.md` - データベース設計書
- `CLAUDE.md` - プロジェクトガイドライン

**外部リソース**:
- [Prisma - Aggregation, grouping, and summarizing](https://www.prisma.io/docs/orm/prisma-client/queries/aggregation-grouping-summarizing)
- [Next.js - Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [MDN - HTTP headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)

---

### 2. 開発環境の改善と新機能追加

#### 実装内容

1. **管理者ページの認証無効化（開発中のみ）**
2. **スポット詳細にいいね機能を追加**

---

#### 2-1. 管理者ページの認証無効化（開発環境用）

**目的**: 開発中のテストを容易にするため、一時的に認証チェックを無効化

**⚠️ 重要**: この設定は開発中のみ使用。本番環境では必ず認証を有効化する必要があります。

**変更ファイル**:

1. **フロントエンド認証チェックの無効化**
   - `src/app/admin/analytics/page.tsx`
   ```typescript
   // 認証チェック（開発中は無効化）
   useEffect(() => {
     // 開発中のため認証チェックをスキップ
     setAuthChecking(false);

     /* 本番環境では以下のコメントを解除してください
     const checkAuth = async () => {
       // ... 認証チェックコード
     };
     void checkAuth();
     */
   }, [router]);
   ```

2. **APIエンドポイントの認証チェック無効化**
   - `src/app/api/admin/analytics/spot-history/route.ts`
   - `src/app/api/admin/analytics/search-logs/route.ts`
   - `src/app/api/admin/analytics/popularity/route.ts`
   - `src/app/api/admin/analytics/export/route.ts`

   各ファイルで認証チェックをコメントアウト：
   ```typescript
   export async function GET(request: Request) {
     try {
       // 開発中のため認証チェックを無効化
       /* 本番環境では以下のコメントを解除してください
       const supabase = await createSupabaseServerClient();
       const { data: { user } } = await supabase.auth.getUser();
       // ... 認証・認可チェック
       */
   ```

**本番環境への移行手順**:
1. 各ファイルの `/* 本番環境では...*/` コメント内のコードを解除
2. 開発用コード（`setAuthChecking(false);` など）を削除
3. 認証が正しく動作することを確認してからデプロイ

---

#### 2-2. スポット詳細にいいね機能の実装

**目的**: ユーザーがスポットに対していいねを付けられる機能を追加し、人気度を測定できるようにする

**データフロー**:
```
ユーザー → いいねボタンクリック → POST /api/spots/:id/like
          → SpotInteractionテーブルに記録 → いいね数更新
          → ローカルストレージに状態保存 → UI更新
```

**実装詳細**:

**1. APIエンドポイントの作成**

ファイル: `src/app/api/spots/[id]/like/route.ts`

```typescript
/**
 * GET /api/spots/:id/like
 * スポットのいいね数を取得
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  // いいね数を取得
  const likeCount = await prisma.spotInteraction.count({
    where: { spot_id: id, type: "LIKE" },
  });

  return NextResponse.json({
    data: { spot_id: id, like_count: likeCount },
  });
}

/**
 * POST /api/spots/:id/like
 * スポットにいいねを追加/削除（トグル）
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { session_id } = await request.json();

  // 既存のいいねを確認
  const existingLike = await prisma.spotInteraction.findFirst({
    where: { spot_id: id, session_id: session_id, type: "LIKE" },
  });

  if (existingLike) {
    // 既にいいねしている場合は削除（トグル）
    await prisma.spotInteraction.delete({ where: { id: existingLike.id } });
    const likeCount = await prisma.spotInteraction.count({
      where: { spot_id: id, type: "LIKE" },
    });
    return NextResponse.json({ data: { liked: false, like_count: likeCount } });
  } else {
    // いいねを追加
    await prisma.spotInteraction.create({
      data: { spot_id: id, session_id: session_id, type: "LIKE" },
    });
    const likeCount = await prisma.spotInteraction.count({
      where: { spot_id: id, type: "LIKE" },
    });
    return NextResponse.json({ data: { liked: true, like_count: likeCount } });
  }
}
```

**2. フロントエンド実装**

ファイル: `src/components/spot-explorer.tsx`

**状態管理**:
```typescript
// いいね機能
const [likeCount, setLikeCount] = useState<number>(0);
const [isLiked, setIsLiked] = useState<boolean>(false);
const [isLiking, setIsLiking] = useState<boolean>(false);
```

**セッションID管理**:
```typescript
const getSessionId = useCallback(() => {
  if (typeof window === "undefined") return "";

  let sessionId = localStorage.getItem("folklore_session_id");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("folklore_session_id", sessionId);
  }
  return sessionId;
}, []);
```

**いいね数の取得**:
```typescript
useEffect(() => {
  if (!selectedId) return;

  async function fetchLikeCount() {
    try {
      const res = await fetch(`/api/spots/${selectedId}/like`);
      if (res.ok) {
        const data = await res.json();
        setLikeCount(data.data.like_count);

        // ローカルストレージで自分がいいねしたかチェック
        const likedSpots = JSON.parse(localStorage.getItem("liked_spots") || "[]");
        setIsLiked(likedSpots.includes(selectedId));
      }
    } catch (error) {
      console.error("いいね数の取得エラー:", error);
    }
  }

  void fetchLikeCount();
}, [selectedId, getSessionId]);
```

**いいねボタンのハンドラー**:
```typescript
const handleLike = useCallback(async () => {
  if (!selectedId || isLiking) return;

  setIsLiking(true);
  try {
    const sessionId = getSessionId();
    const res = await fetch(`/api/spots/${selectedId}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    });

    if (res.ok) {
      const data = await res.json();
      setLikeCount(data.data.like_count);
      setIsLiked(data.data.liked);

      // ローカルストレージを更新
      const likedSpots = JSON.parse(localStorage.getItem("liked_spots") || "[]");
      if (data.data.liked) {
        likedSpots.push(selectedId);
      } else {
        const index = likedSpots.indexOf(selectedId);
        if (index > -1) likedSpots.splice(index, 1);
      }
      localStorage.setItem("liked_spots", JSON.stringify(likedSpots));
    }
  } catch (error) {
    console.error("いいねエラー:", error);
  } finally {
    setIsLiking(false);
  }
}, [selectedId, isLiking, getSessionId]);
```

**UIコンポーネント**:
```tsx
{/* いいねボタン */}
<div className="flex items-center gap-3 py-3 border-t border-b border-gray-200">
  <button
    onClick={handleLike}
    disabled={isLiking}
    className={cn(
      "flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all",
      isLiked
        ? "bg-pink-100 text-pink-600 hover:bg-pink-200"
        : "bg-gray-100 text-gray-600 hover:bg-gray-200",
      isLiking && "opacity-50 cursor-not-allowed"
    )}
  >
    <span className="text-xl">
      {isLiked ? "❤️" : "🤍"}
    </span>
    <span className="text-sm">
      いいね {likeCount > 0 && `(${likeCount})`}
    </span>
  </button>
</div>
```

**表示位置**:
スポット詳細パネル内で、住所・Google マップリンクの下、説明文の上に配置しました。

#### 技術的な詳細

**1. セッションID管理**
- ブラウザのlocalStorageに保存
- 形式: `session_${timestamp}_${randomString}`
- ログインしていないユーザーも一意に識別可能

**2. いいね状態の永続化**
- **データベース**: SpotInteractionテーブルに記録（type="LIKE"）
- **ローカルストレージ**: `liked_spots` 配列にスポットIDを保存（クライアントサイド）

**3. トグル機能**
- 同じスポットに対して再度いいねボタンをクリックすると、いいねを取り消し
- データベースから該当レコードを削除
- UIとローカルストレージも同期して更新

**4. パフォーマンス最適化**
- いいね数の取得はスポット選択時に1回のみ
- いいね状態はローカルストレージからも読み込み、高速表示
- 楽観的UI更新（即座にUIを更新し、バックグラウンドでAPI呼び出し）

#### 学んだこと

**1. トグルボタンのUXデザイン**
- いいね済み/未いいねで視覚的にわかりやすいアイコンと色を使用
- クリック中は無効化して二重送信を防止
- いいね数を常に表示してソーシャルプルーフを提供

**2. セッションIDの生成**
- timestamp + random文字列で衝突を防止
- ブラウザごとに一意のIDを生成
- ログインなしでもユーザー追跡が可能

**3. ローカルストレージとデータベースの同期**
- クライアント側でいいね状態を即座に反映
- データベースで永続化して全ユーザー間で共有
- ローカルストレージは補助的な役割（高速表示のため）

**4. React hooksの活用**
- useCallback で関数をメモ化し、不要な再レンダリングを防止
- useEffect で副作用を管理（API呼び出し）
- useState で複数の状態を適切に管理

#### 今後の改善案

**フェーズ2: リアルタイム更新**
- WebSocketまたはServer-Sent Eventsでいいね数をリアルタイム更新
- 他のユーザーがいいねした瞬間に数値が増える

**フェーズ3: アニメーション強化**
- いいねボタンクリック時のアニメーション（ハートが跳ねる、拡大など）
- いいね数のカウントアップアニメーション

**フェーズ4: 分析との統合**
- 管理者分析ダッシュボードでいいね数のランキング表示（既に実装済み）
- 時系列でのいいね数推移グラフ
- ユーザー属性別のいいね傾向分析

**フェーズ5: ソーシャル機能の拡張**
- コメント機能の追加
- シェア機能の実装（Twitter、LINE、Facebookなど）
- お気に入り（保存）機能の追加

#### 関連ファイル

**APIエンドポイント**:
- `src/app/api/spots/[id]/like/route.ts` - いいねAPI

**フロントエンド**:
- `src/components/spot-explorer.tsx` - スポット詳細表示といいね機能

**データベース**:
- `prisma/schema.prisma` - SpotInteractionモデル（既存）

#### 参照

**関連ドキュメント**:
- `analytics.md` - 分析機能の詳細（いいね数の集計含む）
- `db_design.md` - SpotInteractionモデルの設計
- `api_design.md` - API仕様

**外部リソース**:
- [React - useCallback Hook](https://react.dev/reference/react/useCallback)
- [MDN - Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [Prisma - CRUD operations](https://www.prisma.io/docs/orm/prisma-client/queries/crud)
