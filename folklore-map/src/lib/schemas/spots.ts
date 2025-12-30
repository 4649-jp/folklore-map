import { z } from "zod";
import { sanitizeUrl } from "../sanitize";

export const SourceSchema = z.object({
  type: z.enum(["URL", "BOOK", "INTERVIEW"]),
  citation: z.string().min(3),
  url: z
    .string()
    .url()
    .optional()
    .refine(
      (url) => {
        if (!url) return true;
        return sanitizeUrl(url) !== null;
      },
      {
        message: "許可されていないURLスキームです（http、https、mailtoのみ）",
      }
    ),
});

export const SpotCreateSchema = z
  .object({
    title: z.string().min(2).max(80),
    description: z.string().min(10).max(3000),
    address: z.string().min(3),
    maps_query: z.string().min(3),
    maps_place_id: z.string().optional(),
    icon_type: z.enum([
      "ONI",
      "KITSUNE",
      "DOG",
      "DRAGON",
      "TEMPLE",
      "SHRINE",
      "ANIMAL",
      "GENERIC",
    ]),
    sources: z.array(SourceSchema).min(1),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    era_hint: z.string().max(120).optional(),
  })
  .refine(
    (v) => v.sources.every((s) => s.type !== "URL" || Boolean(s.url)),
    {
      path: ["sources"],
      message: "type が URL の場合は url を必須にしてください。",
    }
  );

export const SpotListQuerySchema = z.object({
  bbox: z
    .string()
    .regex(
      /^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/,
      "bbox は west,south,east,north の順で指定してください。"
    )
    .optional(),
  q: z.string().max(120).optional(),
  status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "all"]).optional(),
  limit: z.coerce.number().min(1).max(100).optional(), // DoS対策: 最大100に制限
  offset: z.coerce.number().min(0).optional(), // ページネーション用
  icon_types: z.string().optional(), // カンマ区切りのアイコンタイプ
  era: z.string().max(120).optional(), // 時代フィルター（部分一致）
});

export type SpotCreateInput = z.infer<typeof SpotCreateSchema>;
export type SpotListQueryInput = z.infer<typeof SpotListQuerySchema>;

export const SpotUpdateSchema = z
  .object({
    title: SpotCreateSchema.shape.title.optional(),
    description: SpotCreateSchema.shape.description.optional(),
    address: SpotCreateSchema.shape.address.optional(),
    maps_query: SpotCreateSchema.shape.maps_query.optional(),
    maps_place_id: SpotCreateSchema.shape.maps_place_id.optional(),
    icon_type: SpotCreateSchema.shape.icon_type.optional(),
    lat: SpotCreateSchema.shape.lat.optional(),
    lng: SpotCreateSchema.shape.lng.optional(),
    era_hint: SpotCreateSchema.shape.era_hint.optional(),
    status: z.enum(["DRAFT", "REVIEW", "PUBLISHED"]).optional(),
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    { message: "更新する項目を1つ以上指定してください。" }
  );

export type SpotUpdateInput = z.infer<typeof SpotUpdateSchema>;
