# データベース基本設計（Prisma スキーマ付き）

## 方針
- 本番：Supabase（PostgreSQL）
- ローカル学習：SQLite でも同じ Prisma で動作。移植性を確保。

## Prisma `schema.prisma`
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = env("PRISMA_PROVIDER") // "postgresql" or "sqlite"
  url      = env("DATABASE_URL")
}

model Spot {
  id            String   @id @default(cuid())
  title         String
  description   String
  lat           Float
  lng           Float
  icon_type     IconType @default(GENERIC)
  era_hint      String?

  // 100|200|300 のいずれか
  blur_radius_m Int

  status        SpotStatus @default(DRAFT)
  created_by    String
  created_at    DateTime   @default(now())     // 追加（分析用）
  updated_at    DateTime   @updatedAt

  sources       Source[]
  flags         Flag[]
  views         SpotView[]         // 追加（分析用）
  interactions  SpotInteraction[]  // 追加（分析用）

  @@index([created_at])  // 追加（分析用）
}

model Source {
  id        String   @id @default(cuid())
  spot      Spot     @relation(fields: [spot_id], references: [id], onDelete: Cascade)
  spot_id   String
  type      SourceType
  citation  String
  url       String?

  @@index([spot_id])
}

model Flag {
  id         String   @id @default(cuid())
  spot       Spot     @relation(fields: [spot_id], references: [id], onDelete: Cascade)
  spot_id    String
  reason     FlagReason
  note       String?
  created_by String
  status     FlagStatus @default(OPEN)
  created_at DateTime   @default(now())

  @@index([spot_id])
}

model Audit {
  id         String   @id @default(cuid())
  entity     String
  entity_id  String
  action     String
  detail_json Json?
  by         String
  at         DateTime  @default(now())

  @@index([entity, entity_id])
  @@index([at])  // 追加（期間フィルタ用）
}

// === 分析用モデル ===

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

enum IconType {
  ONI
  KITSUNE
  DOG
  DRAGON
  TEMPLE
  SHRINE
  ANIMAL
  GENERIC
}

enum SpotStatus {
  DRAFT
  REVIEW
  PUBLISHED
}

enum SourceType {
  URL
  BOOK
  INTERVIEW
}

enum FlagReason {
  INAPPROPRIATE
  WRONG_INFO
  DISCRIMINATION
  PRIVACY
}

enum FlagStatus {
  OPEN
  CLOSED
}
```

## インデックス設計
- 緯度経度は PostgreSQL では PostGIS 拡張 or `cube + earthdistance` を検討。MVP は bbox + LIMIT。
- `Spot.status` による公開抽出、`Spot.updated_at` で並び替え。

## RLS（概念）
- `Spot.status = 'PUBLISHED'` のみ anon で SELECT 可能。
- `created_by = auth.uid()` の `DRAFT|REVIEW` は本人にのみ可視。
- reviewer/admin は JWT の権限クレームでフル可視。