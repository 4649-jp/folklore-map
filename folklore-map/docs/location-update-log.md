# 位置情報更新作業ログ

## 作業日時
2025-11-09

## 作業概要
全スポットの位置情報をGoogle Maps APIから取得した正確なデータに更新し、Google Place IDと正式な住所を設定しました。

---

## 実施した作業

### 1. データベーススキーマの更新

#### 変更内容
`Spot`モデルに`maps_place_id`フィールドを追加

```prisma
model Spot {
  id             String     @id @default(cuid())
  title          String
  description    String
  address        String?
  maps_query     String?
  maps_place_id  String?    // ← 新規追加
  lat            Float
  lng            Float
  icon_type      IconType   @default(GENERIC)
  era_hint       String?
  blur_radius_m  Int
  status         SpotStatus @default(DRAFT)
  created_by     String
  updated_at     DateTime   @updatedAt

  sources Source[]
  flags   Flag[]

  @@index([status, updated_at])
}
```

#### マイグレーション実行
```bash
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" pnpm prisma db push
```

**結果**: ✅ 成功（594ms）

---

### 2. ジオコーディングAPIの更新

#### ファイル
`src/app/api/geocode/route.ts`

#### 変更内容
Google Maps APIから取得した`place_id`をレスポンスに含めるよう変更

**変更前:**
```typescript
type GoogleGeocodeResult = {
  geometry: {
    location: { lat: number; lng: number };
    location_type: string;
  };
  formatted_address: string;
  types: string[];
};
```

**変更後:**
```typescript
type GoogleGeocodeResult = {
  geometry: {
    location: { lat: number; lng: number };
    location_type: string;
  };
  formatted_address: string;
  place_id: string;  // ← 追加
  types: string[];
};
```

**レスポンスに追加:**
```typescript
return jsonResponse({
  formatted_address: top.formatted_address,
  place_id: top.place_id,  // ← 追加
  lat: blurred.lat,
  lng: blurred.lng,
  blur_radius_m: blurRadius,
  confidence,
  // ...
});
```

---

### 3. バリデーションスキーマの更新

#### ファイル
`src/lib/schemas/spots.ts`

#### 変更内容
`SpotCreateSchema`と`SpotUpdateSchema`に`maps_place_id`フィールドを追加

```typescript
export const SpotCreateSchema = z
  .object({
    title: z.string().min(2).max(80),
    description: z.string().min(10).max(3000),
    address: z.string().min(3),
    maps_query: z.string().min(3),
    maps_place_id: z.string().optional(),  // ← 追加
    icon_type: z.enum([/* ... */]),
    // ...
  })
```

---

### 4. 投稿フォームの更新

#### ファイル
`src/components/spot-form.tsx`

#### 変更内容
ジオコーディング結果から取得した`place_id`をAPIに送信

```typescript
const geocodeData = await geocodeRes.json();
const geo = geocodeData.data;

const payload = {
  title: values.title,
  description: values.description,
  address: geo.formatted_address ?? values.address,  // ← Google Mapsの正式な住所を使用
  maps_query: mapsQuery,
  maps_place_id: geo.place_id,  // ← 追加
  // ...
};
```

---

### 5. Spot APIの更新

#### ファイル
- `src/app/api/spots/route.ts` (POST)
- `src/app/api/spots/[id]/route.ts` (GET, PATCH)

#### 変更内容

**POST API（作成）:**
```typescript
const spot = await tx.spot.create({
  data: {
    title,
    description,
    address,
    maps_query,
    maps_place_id,  // ← 追加
    icon_type,
    lat,
    lng,
    blur_radius_m,
    era_hint,
    created_by: userId as string,
    status: "DRAFT",
  },
});
```

**GET API（取得）:**
```typescript
return jsonResponse({
  id: spot.id,
  title: spot.title,
  description: spot.description,
  address: spot.address,
  maps_query: spot.maps_query,
  maps_place_id: spot.maps_place_id,  // ← 追加
  // ...
});
```

**PATCH API（更新）:**
```typescript
if (data.maps_place_id !== undefined) {
  updateData.maps_place_id = data.maps_place_id;  // ← 追加
}
```

---

### 6. 厳島神社の位置情報修正

#### 問題
厳島神社の位置情報が不正確でした。

#### 実施内容
Google Maps APIでジオコーディングを実施し、正確な位置情報に更新

**更新前:**
- 緯度: 34.347
- 経度: 132.323
- 住所: 広島県廿日市市宮島町1-1
- Place ID: 未設定

**更新後:**
- 緯度: 34.296
- 経度: 132.320
- 住所: 日本、〒739-0588 広島県廿日市市宮島町１−１
- Place ID: ChIJj23HfgTjGmARkNW10PcocjU
- ぼかし半径: 300m（後に0mに変更）

#### 使用スクリプト
`scripts/update-itsukushima.ts`

---

### 7. 全スポットの位置情報一括更新

#### 対象
全125件のスポット

#### 実施内容1: ぼかし処理適用版（一時的）
最初は、プライバシー保護のため100m/200m/300mのぼかし処理を適用して更新

**使用スクリプト:**
`scripts/update-all-locations.ts`

**処理内容:**
- Google Maps APIでジオコーディング
- 信頼度に基づくぼかし半径の選択
  - 高信頼度 (≥0.9): 300m
  - 中信頼度 (0.6-0.9): 200m
  - 低信頼度 (<0.6): 100m
- ランダムオフセットでぼかし適用

**結果:**
- 成功: 113件
- 失敗: 0件
- 実行時間: 約4分

#### 実施内容2: 正確な位置情報版（最終版）
ユーザーの要望により、ぼかし処理を適用せず正確な位置情報を使用するよう変更

**使用スクリプト:**
`scripts/update-exact-locations.ts`

**変更点:**
- ぼかし処理を削除
- `blur_radius_m`を0に設定
- Google Maps APIから取得した座標をそのまま使用

**処理内容:**
```typescript
return {
  address: formattedAddress,
  lat,  // Google Mapsの正確な緯度
  lng,  // Google Mapsの正確な経度
  blur_radius_m: 0,  // ぼかしなし
  maps_query: mapsQuery,
  maps_place_id: placeId,
};
```

**実行コマンド:**
```bash
cd folklore-map
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  pnpm tsx scripts/update-exact-locations.ts
```

**結果:**
- ✅ 成功: 125件
- ❌ 失敗: 0件
- 実行時間: 約4分30秒
- レート制限対策: 各リクエスト間に2秒の待機時間

---

## 最終的なデータ状態

### 全スポット（125件）に設定された情報

1. **正式な住所** (`address`)
   - Google Maps APIの`formatted_address`を使用
   - 郵便番号付きの正確な住所
   - 例: `日本、〒739-0588 広島県廿日市市宮島町１−１`

2. **Google Place ID** (`maps_place_id`)
   - Googleが各場所に割り当てる一意の識別子
   - 例: `ChIJj23HfgTjGmARkNW10PcocjU`

3. **正確な座標** (`lat`, `lng`)
   - Google Maps APIから取得した正確な緯度・経度
   - ぼかし処理なし

4. **ぼかし半径** (`blur_radius_m`)
   - 全スポット: `0m`（ぼかし処理なし）

5. **Google Maps検索クエリ** (`maps_query`)
   - Google Mapsで直接検索できるURLパラメーター
   - 形式: `api=1&query=<住所>`

---

## サンプルデータ

```json
{
  "id": "cmhraum0j003s3oiafze3kkre",
  "title": "厳島神社",
  "address": "日本、〒739-0588 広島県廿日市市宮島町１−１",
  "maps_query": "api=1&query=日本、〒739-0588 広島県廿日市市宮島町１−１",
  "maps_place_id": "ChIJj23HfgTjGmARkNW10PcocjU",
  "lat": 34.29598960000001,
  "lng": 132.3198285,
  "blur_radius_m": 0,
  "icon_type": "SHRINE",
  "status": "PUBLISHED"
}
```

---

## 作成したスクリプト

### 1. `scripts/check-spot.ts`
厳島神社のデータを確認するスクリプト

### 2. `scripts/update-itsukushima.ts`
厳島神社の位置情報を更新するスクリプト

### 3. `scripts/check-all-spots.ts`
全スポットの情報を一覧表示するスクリプト

### 4. `scripts/update-all-locations.ts`
全スポットの位置情報を更新（ぼかし処理適用版）

### 5. `scripts/update-exact-locations.ts`
全スポットの位置情報を更新（正確な位置情報版・最終版）

### 6. `scripts/sample-check.ts`
サンプルスポットの情報を確認するスクリプト

---

## 技術的な詳細

### Google Maps Geocoding API

**エンドポイント:**
```
https://maps.googleapis.com/maps/api/geocode/json
```

**リクエストパラメーター:**
- `address`: ジオコーディング対象の住所
- `key`: Google Maps API Key
- `language`: `ja` (日本語)
- `region`: `jp` (日本)

**レスポンスから使用した情報:**
- `formatted_address`: 正式な住所
- `place_id`: Google Place ID
- `geometry.location.lat`: 緯度
- `geometry.location.lng`: 経度
- `geometry.location_type`: 位置情報の精度

### レート制限対策

Google Maps Geocoding APIのレート制限（30リクエスト/分）に対応するため、各リクエスト間に2秒の待機時間を設定

```typescript
await new Promise(resolve => setTimeout(resolve, 2000));
```

---

## 確認方法

### データベースから確認
```bash
cd folklore-map
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  pnpm tsx scripts/check-all-spots.ts
```

### サンプル確認
```bash
cd folklore-map
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  pnpm tsx scripts/sample-check.ts
```

### 開発サーバーで確認
```bash
cd folklore-map
pnpm dev
```

ブラウザで http://localhost:3000 にアクセスし、地図上で全スポットが正確な位置に表示されることを確認

---

## 今後の注意事項

### 新規スポット投稿時
- 投稿フォームで住所を入力すると、自動的にGoogle Maps APIでジオコーディングが実行されます
- `formatted_address`, `place_id`, 正確な座標が自動的に設定されます
- `blur_radius_m`は0に設定されます（ぼかし処理なし）

### 位置情報の更新
既存スポットの位置情報を再度更新する場合は、以下のスクリプトを使用：

```bash
cd folklore-map
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  pnpm tsx scripts/update-exact-locations.ts
```

---

## 環境変数

位置情報更新に必要な環境変数:

```bash
# Google Maps API Key（サーバーサイド用）
GOOGLE_MAPS_API_KEY=your_api_key_here

# Supabase Database URL
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

---

## 作業完了チェックリスト

- [x] データベーススキーマに`maps_place_id`フィールドを追加
- [x] ジオコーディングAPIで`place_id`を返すよう変更
- [x] バリデーションスキーマを更新
- [x] 投稿フォームを更新
- [x] Spot作成・取得・更新APIを更新
- [x] 厳島神社の位置情報を修正
- [x] 全125件のスポット位置情報を更新
- [x] ぼかし処理を削除（blur_radius_m = 0）
- [x] 全スポットの正確な座標を設定
- [x] 全スポットにPlace IDを設定
- [x] 全スポットに正式な住所を設定
- [x] データベースマイグレーション完了
- [x] 更新結果の確認完了

---

## 作業者メモ

- 全スポットの位置情報がGoogle Maps APIから取得した正確なデータに更新されました
- プライバシー保護のためのぼかし処理は、ユーザーの要望により適用しないことになりました
- Place IDを使用することで、将来的にGoogle Maps APIの他の機能（写真、レビュー等）も利用可能です
- レート制限により全件更新には約4-5分かかります
