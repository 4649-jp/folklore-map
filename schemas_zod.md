# 入出力スキーマ詳細（Zod / TypeScript）

```ts
// src/lib/schemas.ts
import { z } from "zod";

export const SourceSchema = z.object({
  type: z.enum(["URL","BOOK","INTERVIEW"]),
  citation: z.string().min(3),
  url: z.string().url().optional()
});

export const SpotCreateSchema = z.object({
  title: z.string().min(2).max(80),
  description: z.string().min(10).max(3000),
  address: z.string().min(3),
  icon_type: z.enum(["ONI","KITSUNE","DOG","DRAGON","TEMPLE","SHRINE","ANIMAL","GENERIC"]),
  sources: z.array(SourceSchema).min(1)
}).refine(v => v.sources.every(s => s.type!=="URL" || !!s.url), { message:"URL型にはurl必須" });

export const SpotListQuerySchema = z.object({
  bbox: z.string().regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/).optional(),
  q: z.string().optional(),
  tags: z.string().optional(),
  era: z.string().optional(),
  status: z.enum(["DRAFT","REVIEW","PUBLISHED"]).optional()
});
```

**レスポンス型（抜粋）**
```ts
export type SpotListItem = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  icon_type: "ONI"|"KITSUNE"|"DOG"|"DRAGON"|"TEMPLE"|"SHRINE"|"ANIMAL"|"GENERIC";
};

export type SpotDetail = SpotListItem & {
  description: string;
  era_hint?: string;
  blur_radius_m: 100|200|300;
  sources: Array<{id:string;type:"URL"|"BOOK"|"INTERVIEW";citation:string;url?:string}>;
  status: "DRAFT"|"REVIEW"|"PUBLISHED";
  updated_at: string;
  created_by: string;
};
```