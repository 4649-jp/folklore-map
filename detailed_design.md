# 詳細設計（Detailed Design）— 民俗学版「大島てる」
対象：Sechack365発表用 / 初学者にも理解できるよう丁寧に記述  
前提：Ubuntu + Node.js(Next.js/TS) + Python、DBはSupabase(PostgreSQL)、地図はGoogle Maps

---

## 1. モジュール分割と責務
### 1.1 フロントエンド（Next.js / React / TS）
- `app/(public)/page.tsx`：地図トップ（マップ、検索、フィルタ、リスト）
- `components/Map.tsx`：Google Maps埋め込み＋マーカー描画
- `components/SpotCard.tsx`：詳細モーダル
- `components/SpotForm.tsx`：投稿フォーム（Zodバリデーション）
- `components/Filters.tsx`：タグ・時代・公開状態フィルター
- `lib/apiClient.ts`：API呼び出し（fetch wrapper、型付き）
- `lib/maps.ts`：マップ初期化、古地図オーバーレイ管理

### 1.2 バックエンド（Next.js Route Handlers）
- `app/api/spots/route.ts`：GET（一覧）/POST（新規作成）
- `app/api/spots/[id]/route.ts`：GET/PATCH/DELETE
- `app/api/spots/[id]/publish/route.ts`：POST（公開遷移）
- `app/api/geocode/route.ts`：POST（住所→座標）
- 共通：`lib/db.ts`（Prisma/Supabase Client）、`lib/auth.ts`（ロール判定）

### 1.3 Pythonエージェント
- `python/harvester.py`：取得（URL・手入力CSV）
- `python/curator.py`：要約・重複排除・タグ抽出
- `python/ethics_gate.py`：NG検出（差別・誹謗中傷・PII）
- `python/icon_tagger.py`：アイコン分類（ルールベース→後にMLへ拡張）

---

## 2. データ詳細（フィールド定義・制約）
### 2.1 Spot（地点）
| フィールド | 型 | 必須 | 制約/仕様 |
|---|---|---|---|
| id | string(cuid) | 必須 | 主キー |
| title | string(2..80) | 必須 | Zodで長さ検証 |
| description | string(<=3000) | 必須 | 出典必須。引用は短く、要約重視 |
| lat/lng | float | 必須 | `geocode`経由で算出。保存時に「ぼかし」適用後の値 |
| icon_type | enum | 必須 | `ONI/KITSUNE/DOG/DRAGON/TEMPLE/SHRINE/ANIMAL/GENERIC` |
| era_hint | string? | 任意 | 例：「江戸後期/明治」 |
| blur_radius_m | int | 必須 | 100/200/300 のいずれか |
| status | enum | 必須 | `DRAFT/REVIEW/PUBLISHED` |
| created_by | string(uid) | 必須 | 投稿者（Supabase Auth uid） |
| updated_at | datetime | 自動 | Prisma `@updatedAt` |

### 2.2 Source（出典）
| フィールド | 型 | 必須 | 制約/仕様 |
|---|---|---|---|
| id | string(cuid) | 必須 |  |
| spot_id | string | 必須 | SpotとFK |
| type | enum | 必須 | `URL/BOOK/INTERVIEW` |
| citation | string | 必須 | 書誌/引用情報 |
| url | string? | 任意 | `type=URL` では必須 |

### 2.3 Flag（通報）/ Audit（監査） …（省略→DB設計に準拠）

---

## 3. バリデーション仕様（Zod スキーマ）
**共通ルール**：エラーは `{field, code, message}` 配列で返却。  
```ts
export const SpotSchema = z.object({
  title: z.string().min(2).max(80),
  description: z.string().min(10).max(3000),
  address: z.string().min(3),
  icon_type: z.enum(["ONI","KITSUNE","DOG","DRAGON","TEMPLE","SHRINE","ANIMAL","GENERIC"]),
  sources: z.array(z.object({
    type: z.enum(["URL","BOOK","INTERVIEW"]),
    citation: z.string().min(3),
    url: z.string().url().optional()
  })).min(1)
}).refine(v => v.sources.every(s => s.type!=="URL" || !!s.url), { path:["sources"], message:"URL型にはurl必須" });
```

---

## 4. ぼかしアルゴリズム（座標プライバシー）
- 目的：地点の特定を避ける（差別・プライバシー対策）。
- 入力：`(lat, lng)`、`confidence(0..1)`。  
- 規則：
  - `confidence >= 0.9 → 300m`
  - `0.6..0.9 → 200m`
  - `< 0.6 → 100m`
- 擬似コード：
```ts
function applyBlur(lat, lng, radiusM){
  const r = radiusM; // 100/200/300
  const earth = 6378137;
  const dn = (Math.random()*2-1) * r;
  const de = (Math.random()*2-1) * r;
  const dLat = dn / earth;
  const dLng = de / (earth * Math.cos(Math.PI*lat/180));
  return { lat: lat + dLat * 180/Math.PI, lng: lng + dLng * 180/Math.PI }
}
```

---

## 5. Google Maps 実装詳細
### 5.1 初期化
- `google.maps.importLibrary('maps')` を利用（v3新方式）。
- 地図オプション：`{ zoomControl:true, mapTypeControl:false, fullscreenControl:false }`。
- アイコン：`/public/icons/{icon_type}.svg`（`aria-label` 付与）。

### 5.2 古地図レイヤ（β）
- 当面：タイルURLを外部設定で保持し、`GroundOverlay` または `ImageMapType` で重ねる。
- 透過スライダー：`<input type="range">` で `opacity` を制御（0〜1）。

### 5.3 マーカー表示ロジック
- `/api/spots?bbox=` で可視範囲だけロード、`clusterer` を将来検討。
- マーカークリックで詳細をフェッチ（キャッシュ：5分）。

---

## 6. API 詳細仕様とエラーカタログ
### 6.1 `/api/spots` GET
- **Query**：`bbox`、`q`、`tags`、`era`、`status`
- **200**：`{ items:[{id,title,lat,lng,icon_type}], nextCursor? }`
- **4xx**：`INVALID_QUERY`（bbox形式不正）
- **429**：`RATE_LIMITED`（簡易制限）

### 6.2 `/api/spots` POST（editor+）
- **入力**：`SpotSchema`
- **処理**：
  1) Zod validate → 2) `/api/geocode` 呼出 → 3) ぼかし → 4) INSERT(draft) → 5) sources一括INSERT  
- **201**：`{ id, status:"DRAFT" }`
- **409**：`DUPLICATE_SPOT`（同一タイトル+近傍500m）

### 6.3 `/api/spots/:id` GET/PATCH/DELETE
- **PATCH**：`status` は reviewer+ 以外不可（権限チェック）

### 6.4 `/api/spots/:id/publish` POST（reviewer+）
- 前提：`ethics_pass=true`、sources>=1
- 失敗：`ETHICS_CHECK_REQUIRED` / `MISSING_SOURCES`

### 6.5 `/api/geocode` POST
- **入力**：`{text}`
- **出力**：`{lat,lng,confidence,blur_radius_m}`
- **RateLimit**：30 req/min/IP

**エラーカタログ（抜粋）**
| code | http | 説明 |
|---|---:|---|
| INVALID_QUERY | 400 | クエリ形式不正 |
| VALIDATION_ERROR | 400 | Zodで不一致 |
| UNAUTHORIZED | 401 | 未ログイン |
| FORBIDDEN | 403 | 権限不足 |
| NOT_FOUND | 404 | リソースなし |
| DUPLICATE_SPOT | 409 | 重複検知 |
| RATE_LIMITED | 429 | レート超過 |
| SERVER_ERROR | 500 | 予期せぬ例外 |

---

## 7. RLS/権限制御（例: Supabase SQL）
```sql
-- 公開データは誰でも読める
create policy "public can read published spots"
on public.spot for select
using (status = 'PUBLISHED');

-- 自分の下書きは自分だけ読める/編集できる
create policy "owner can read drafts"
on public.spot for select
using (created_by = auth.uid() and status in ('DRAFT','REVIEW'));

create policy "owner can update drafts"
on public.spot for update
using (created_by = auth.uid() and status in ('DRAFT','REVIEW'));

-- reviewer/admin は全権（JWT クレームで判定）
create policy "reviewer can manage all"
on public.spot for all
using (auth.jwt() ->> 'role' in ('reviewer','admin'));
```

---

## 8. 監査ログ設計（Audit）
- 形式：`{entity, entity_id, action, by, at, detail_json}`
- 例：
```json
{"entity":"spot","entity_id":"sp_xxx","action":"publish","by":"uid_abc","at":"2025-11-03T12:00:00Z","detail_json":{"from":"REVIEW","to":"PUBLISHED"}}
```

---

## 9. ログ/メトリクス
- **APIアクセス**：`method, path, status, ms`
- **ユース**：検索回数、通報数、承認所要時間
- **PII禁止**：個人情報はログに残さない

---

## 10. テスト設計（概要）
- **ユニット**：Zod、ぼかし関数、重複検知、RLS疑似テスト
- **API統合**：`/api/spots` happy/edge、権限別
- **UI E2E**：マーカー表示→詳細→通報
- **倫理テスト**：NGワード辞書で検出の正否
- **性能**：`/api/spots?bbox=` p95 < 300ms、1万件サンプル

---

## 11. CI/CD
- **CI（GitHub Actions）**：`pnpm lint` / `pnpm test` / `prisma generate` / `build`
- **プレビュー**：Vercel Preview
- **環境保護**：`main` 直push禁止、PR必須

---

## 12. コーディング規約
- ESLint + Prettier（strict）
- 命名：UIは`PascalCase`、関数・変数は`camelCase`
- ファイル：1コンポーネント1ファイル、200行目安
- コメント：初心者向けに要所へ日本語コメントを残す

---

## 13. 依存とバージョン
- Node.js 20 LTS、Next.js 15、React 18、Prisma 最新、Zod 最新、@supabase/supabase-js、google-map-react or @googlemaps/js-api-loader

---

## 14. リスクと対策（詳細）
- **古地図の出典安定性**：URL変更に備えて外部設定化、フェイルセーフで非表示。
- **投稿の質**：フォームに出典必須、テンプレ提供、レビューチェックリスト。
- **差別助長**：地名×差別用語の同時出現を禁止、抽象化して紹介（地図に載せない）。

---

## 15. 移植性の確保
- PrismaでDB差分を吸収（SQLite⇔Postgres）
- APIはRoute Handlersに閉じる（Express依存を減らす）
- 地図ライブラリはラッパー`lib/maps.ts`で抽象化（将来MapLibreへ）

---

## 16. 学習導線（初心者向け）
1. 地図に「固定ピン1個」を表示
2. `/api/spots` の GET を実装し、DBから読み出す
3. 投稿フォームをつけて draft を保存
4. reviewer 画面で `publish` ボタンを押して公開
5. Pythonの`ethics_gate.py`をダミーでも通して流れを理解

以上で、詳細設計の要点をひと通りカバーします。