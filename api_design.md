# API 詳細（IF 仕様）

## 共通
- Base：`/api`
- 認証：Supabase Auth（JWT）。`Authorization: Bearer <token>`
- 返却：`application/json; charset=utf-8`
- エラー：`{ error: { code: string, message: string, details?: any } }`

## /spots
### GET `/spots`
- **Query**：`bbox`（`west,south,east,north`）, `q`, `tags`, `era`, `status`（reviewer+）
- **200**：`{ items: Spot[], nextCursor?: string }`

### GET `/spots/:id`
- **200**：`Spot`（公開 or 権限）

### POST `/spots`（editor+）
- **Body**
```json
{
  "title": "鬼ヶ島の伝説",
  "description": "…出典…",
  "address": "広島県…",
  "icon_type": "ONI",
  "sources": [
    {"type":"URL","citation":"…","url":"https://..."}
  ]
}
```
- **201**：`{ id: "…" , status: "DRAFT" }`

### PATCH `/spots/:id`（editor+）
- フィールド更新（`status` は reviewer+ のみ）

### POST `/spots/:id/publish`（reviewer+）
- **200**：`{ status: "PUBLISHED" }`

### GET `/spots/:id/like`（公開）
スポットのいいね数を取得
- **200**：`{ data: { spot_id: string, like_count: number } }`

### POST `/spots/:id/like`（公開）
スポットにいいねを追加/削除（トグル）
- **Body**：`{ "session_id": "session_xxx" }`
- **200**：`{ data: { liked: boolean, like_count: number } }`

## /geocode
### POST `/geocode`（editor+）
- **Body**：`{ "text": "福知山市 …神社" }`
- **200**：`{ lat, lng, confidence, blur_radius_m }`

## /flags
### POST `/flags`（誰でも）
- **Body**：`{ "spot_id":"…","reason":"DISCRIMINATION","note":"…" }`
- **201**：`{ id:"…", status:"OPEN" }`

### PATCH `/flags/:id`（reviewer+）
- **Body**：`{ "status":"CLOSED", "note":"対応完了" }`

## /admin/analytics（reviewer+）

### GET `/admin/analytics/spot-history`
スポット追加履歴を取得
- **Query**：`start_date`, `end_date`, `limit`, `offset`
- **200**：`{ data: { spots: Spot[], total: number, limit: number, offset: number } }`

### GET `/admin/analytics/search-logs`
検索ログと集計データを取得
- **Query**：`start_date`, `end_date`, `limit`, `offset`
- **200**：`{ data: { logs: SearchLog[], total: number, aggregations: {...} } }`

### POST `/admin/analytics/search-logs`
検索ログを記録（公開API）
- **Body**：`{ keyword, icon_types, era, status, results_count, user_id, session_id }`
- **200**：`{ success: true }`

### GET `/admin/analytics/popularity`
コンテンツ人気指標を取得（閲覧数、いいね、保存、シェア）
- **Query**：`start_date`, `end_date`, `limit`
- **200**：`{ data: { popularity: [...], summary: {...} } }`

### GET `/admin/analytics/export`
分析データをCSV形式でエクスポート
- **Query**：`type`（`spot-history` | `search-logs` | `popularity`）, `start_date`, `end_date`
- **200**：CSV file download