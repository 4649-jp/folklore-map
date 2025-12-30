# API リファレンス

民俗学マップのAPIエンドポイント一覧と使用方法を記載しています。

---

## ベースURL

開発環境: `http://localhost:3000`

---

## エンドポイント一覧

### スポット関連

#### `GET /api/spots`

公開されているスポット一覧を取得します。

**認証**: 不要

**クエリパラメータ**:
なし（将来的にページネーション、フィルタリングを追加予定）

**レスポンス例**:
```json
{
  "data": {
    "items": [
      {
        "id": "cmhqcds7t00003oomgkueft1f",
        "title": "酒呑童子の伝説",
        "lat": 35.29824627605038,
        "lng": 135.1283013858232,
        "icon_type": "ONI",
        "status": "PUBLISHED",
        "updated_at": "2025-11-08T13:50:28.889Z"
      }
    ]
  }
}
```

---

#### `GET /api/spots/[id]`

特定のスポットの詳細情報を取得します。

**認証**:
- 公開スポット（PUBLISHED）: 不要
- 下書き・審査中スポット: 作成者、reviewer、adminのみ

**パスパラメータ**:
- `id`: スポットID（cuid形式）

**レスポンス例**:
```json
{
  "data": {
    "id": "cmhqcds7t00003oomgkueft1f",
    "title": "酒呑童子の伝説",
    "description": "一条天皇の時代、京の若者や姫君が次々と神隠しに遭った...",
    "icon_type": "ONI",
    "lat": 35.29824627605038,
    "lng": 135.1283013858232,
    "blur_radius_m": 200,
    "era_hint": "平安時代",
    "status": "PUBLISHED",
    "updated_at": "2025-11-08T13:50:28.889Z",
    "created_by": "seed-script",
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

**エラーレスポンス**:

404 Not Found:
```json
{
  "error": {
    "message": "スポットが見つかりませんでした。",
    "code": "NOT_FOUND"
  }
}
```

403 Forbidden:
```json
{
  "error": {
    "message": "閲覧権限がありません。",
    "code": "FORBIDDEN"
  }
}
```

---

#### `POST /api/spots`

新しいスポットを作成します。

**認証**: 必須（editor以上）

**リクエストボディ**:
```json
{
  "title": "新しい伝承のタイトル",
  "description": "詳細な説明文",
  "icon_type": "SHRINE",
  "lat": 35.6812,
  "lng": 139.7671,
  "blur_radius_m": 200,
  "era_hint": "平安時代",
  "sources": [
    {
      "type": "URL",
      "citation": "参考文献の引用情報",
      "url": "https://example.com/source"
    }
  ]
}
```

**フィールド仕様**:
- `title`: 必須、文字列、1-200文字
- `description`: 必須、文字列、1-10000文字
- `icon_type`: 必須、列挙型（SHRINE, ONI, KITSUNE, DRAGON, ANIMAL, GENERIC）
- `lat`: 必須、数値、-90～90
- `lng`: 必須、数値、-180～180
- `blur_radius_m`: 必須、列挙型（100, 200, 300）
- `era_hint`: オプション、文字列、1-100文字
- `sources`: 配列、各要素はSource型

**レスポンス**:
```json
{
  "data": {
    "id": "新規作成されたスポットのID",
    "title": "新しい伝承のタイトル",
    "status": "DRAFT",
    "created_at": "2025-11-08T14:00:00.000Z"
  }
}
```

---

#### `PATCH /api/spots/[id]`

既存のスポットを更新します。

**認証**:
- 作成者: 自分が作成したスポットのみ、PUBLISHEDは不可
- reviewer以上: すべてのスポット、ステータス変更可能

**リクエストボディ**（部分更新可能）:
```json
{
  "title": "更新されたタイトル",
  "description": "更新された説明",
  "status": "SUBMITTED"
}
```

**エラーレスポンス**:

403 Forbidden（権限不足）:
```json
{
  "error": {
    "message": "このスポットを更新する権限がありません。",
    "code": "FORBIDDEN"
  }
}
```

400 Bad Request（更新フィールドなし）:
```json
{
  "error": {
    "message": "更新対象のフィールドがありません。",
    "code": "NO_UPDATE_FIELDS"
  }
}
```

---

### 通報（Flag）関連

#### `POST /api/flags`

スポットを通報します。

**認証**: 不要（匿名通報可能）

**リクエストボディ**:
```json
{
  "spot_id": "通報対象のスポットID",
  "reason": "INAPPROPRIATE",
  "comment": "通報理由の詳細説明（オプション）"
}
```

**reason の値**:
- `INAPPROPRIATE`: 不適切な内容
- `INCORRECT`: 情報が不正確
- `DUPLICATE`: 重複投稿
- `OTHER`: その他

---

#### `PATCH /api/flags/[id]`

通報のステータスを更新します（レビュー処理）。

**認証**: 必須（reviewer以上）

**リクエストボディ**:
```json
{
  "status": "RESOLVED",
  "note": "対応内容のメモ（オプション）"
}
```

**status の値**:
- `PENDING`: 未対応
- `RESOLVED`: 解決済み
- `REJECTED`: 却下

---

### ジオコーディング関連

#### `POST /api/geocode`

住所から座標を取得します。

**認証**: 必須（editor以上）

**リクエストボディ**:
```json
{
  "address": "京都府京都市左京区鞍馬本町1074"
}
```

**レスポンス**:
```json
{
  "data": {
    "lat": 35.1218,
    "lng": 135.7681,
    "confidence": 0.95,
    "formatted_address": "日本、〒601-1111 京都府京都市左京区鞍馬本町１０７４"
  }
}
```

---

## データ型定義

### IconType

```typescript
type IconType =
  | "SHRINE"   // 神社・寺院
  | "ONI"      // 鬼
  | "KITSUNE"  // 狐
  | "DRAGON"   // 龍・蛇
  | "ANIMAL"   // 動物
  | "GENERIC"; // その他
```

### SpotStatus

```typescript
type SpotStatus =
  | "DRAFT"      // 下書き
  | "SUBMITTED"  // 審査中
  | "PUBLISHED"; // 公開済み
```

### FlagReason

```typescript
type FlagReason =
  | "INAPPROPRIATE" // 不適切
  | "INCORRECT"     // 不正確
  | "DUPLICATE"     // 重複
  | "OTHER";        // その他
```

### FlagStatus

```typescript
type FlagStatus =
  | "PENDING"   // 未対応
  | "RESOLVED"  // 解決済み
  | "REJECTED"; // 却下
```

### Source

```typescript
type Source = {
  id: string;
  type: "URL" | "BOOK";
  citation: string;  // 引用情報
  url?: string;      // URLタイプの場合
};
```

---

## 認証・認可

### ロール一覧

| ロール | 説明 | 権限 |
|--------|------|------|
| viewer | 閲覧者（デフォルト） | 公開スポットの閲覧のみ |
| editor | 編集者 | スポット作成、自分の下書き編集 |
| reviewer | レビュアー | すべてのスポット編集、ステータス変更、通報処理 |
| admin | 管理者 | 全権限 |

### 認証ヘッダー

Supabase Authのセッションクッキーを使用します。ブラウザからのリクエストでは自動的に付与されます。

APIクライアントから直接呼び出す場合:
```
Authorization: Bearer <access_token>
```

---

## エラーコード一覧

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| UNAUTHORIZED | 401 | 認証が必要です |
| FORBIDDEN | 403 | 権限がありません |
| NOT_FOUND | 404 | リソースが見つかりません |
| INVALID_BODY | 400 | リクエストボディが不正です |
| VALIDATION_ERROR | 400 | バリデーションエラー（詳細はレスポンスに含まれます） |
| NO_UPDATE_FIELDS | 400 | 更新対象のフィールドがありません |
| SERVER_ERROR | 500 | サーバーエラー |

---

## レート制限

現在、レート制限は実装されていません。将来的に追加予定です。

---

**最終更新**: 2025-11-08
