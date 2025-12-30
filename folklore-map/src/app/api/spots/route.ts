import { IconType, Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";

import { prisma } from "@/lib/db";
import { errorResponse, jsonResponse, zodErrorResponse } from "@/lib/http";
import { getUserRole, hasRole, type UserRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  SpotCreateSchema,
  SpotListQuerySchema,
} from "@/lib/schemas/spots";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  // Rate limiting: 100 requests per minute per IP
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const rateLimitResult = rateLimit(
    `spot-list:${clientIp}`,
    RATE_LIMITS.SPOT_LIST
  );

  if (!rateLimitResult.success && rateLimitResult.response) {
    return rateLimitResult.response;
  }

  const searchParams = request.nextUrl.searchParams;
  const parsed = SpotListQuerySchema.safeParse(
    Object.fromEntries(searchParams.entries())
  );
  if (!parsed.success) {
    return zodErrorResponse(parsed.error);
  }

  const { bbox, q, status, limit, offset, icon_types, era } = parsed.data;

  let role: UserRole = "viewer";
  let userId: string | null = null;

  // 認証チェック（開発・本番共通）
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    role = getUserRole(session);
    userId = session?.user.id ?? null;
  } catch (error) {
    console.warn("[GET /api/spots] Supabase セッション取得に失敗しました", error);
    // セッション取得失敗時はviewer権限で継続（公開データのみ表示）
  }

  const andConditions: Prisma.SpotWhereInput[] = [];

  if (bbox) {
    const [west, south, east, north] = bbox.split(",").map(Number);
    andConditions.push({
      lat: { gte: south, lte: north },
      lng: { gte: west, lte: east },
    });
  }

  if (q) {
    andConditions.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  // icon_types フィルター（カンマ区切り）
  if (icon_types) {
    const iconTypeArray = icon_types
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean) as IconType[];
    if (iconTypeArray.length > 0) {
      andConditions.push({
        icon_type: { in: iconTypeArray },
      });
    }
  }

  // era フィルター（部分一致）
  if (era) {
    andConditions.push({
      era_hint: { contains: era, mode: "insensitive" },
    });
  }

  if (hasRole("reviewer", role)) {
    if (status && status !== "all") {
      andConditions.push({ status });
    }
  } else {
    const visibilityCondition: Prisma.SpotWhereInput = userId
      ? {
          OR: [
            { status: "PUBLISHED" },
            { created_by: userId },
          ],
        }
      : { status: "PUBLISHED" };
    andConditions.push(visibilityCondition);

    if (status && status !== "all") {
      if (status === "PUBLISHED") {
        andConditions.push({ status: "PUBLISHED" });
      } else if (userId) {
        andConditions.push({ status, created_by: userId });
      } else {
        return errorResponse("閲覧権限がありません。", {
          status: 403,
          code: "FORBIDDEN",
        });
      }
    }
  }

  // 管理者の場合は詳細情報を含める
  const includeDetails = hasRole("admin", role);

  // DoS対策: デフォルト20、最大100に制限
  const MAX_LIMIT = 100;
  const DEFAULT_LIMIT = 20;
  const safeLimit = Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const safeOffset = offset ?? 0;

  // 総数取得（ページネーション用）
  const total = await prisma.spot.count({
    where:
      andConditions.length > 0
        ? {
            AND: andConditions,
          }
        : undefined,
  });

  const items = await prisma.spot.findMany({
    where:
      andConditions.length > 0
        ? {
            AND: andConditions,
          }
        : undefined,
    select: {
      id: true,
      title: true,
      lat: true,
      lng: true,
      icon_type: true,
      status: true,
      updated_at: true,
      // 管理者の場合は追加情報を含める
      ...(includeDetails && {
        description: true,
        address: true,
        created_by: true,
      }),
    },
    orderBy: {
      updated_at: "desc",
    },
    take: safeLimit,
    skip: safeOffset,
  });

  return jsonResponse({
    items,
    spots: items, // 後方互換性のため両方返す
    total, // ページネーション用の総数
    limit: safeLimit,
    offset: safeOffset,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const role = getUserRole(session);
  const userId = session?.user.id ?? null;

  if (!userId) {
    return errorResponse("ログインが必要です。", {
      status: 401,
      code: "UNAUTHORIZED",
    });
  }

  if (!hasRole("editor", role)) {
    return errorResponse("投稿権限がありません。", {
      status: 403,
      code: "FORBIDDEN",
    });
  }

  // Rate limiting: 10 requests per minute per user
  const rateLimitResult = rateLimit(
    `spot-create:${userId}`,
    RATE_LIMITS.SPOT_CREATE
  );

  if (!rateLimitResult.success && rateLimitResult.response) {
    return rateLimitResult.response;
  }

  const json = await request.json().catch(() => null);
  if (!json) {
    return errorResponse("JSON ボディが必要です。", {
      status: 400,
      code: "INVALID_BODY",
    });
  }

  const parsed = SpotCreateSchema.safeParse(json);
  if (!parsed.success) {
    return zodErrorResponse(parsed.error);
  }

  const {
    title,
    description,
    address,
    maps_query,
    maps_place_id,
    icon_type,
    sources,
    lat,
    lng,
    era_hint,
  } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const spot = await tx.spot.create({
        data: {
          title,
          description,
          address,
          maps_query,
          maps_place_id,
          icon_type,
          lat,
          lng,
          era_hint,
          created_by: userId as string,
          status: "DRAFT",
        },
      });

      if (sources.length > 0) {
        await tx.source.createMany({
          data: sources.map((source) => ({
            spot_id: spot.id,
            type: source.type,
            citation: source.citation,
            url: source.url ?? null,
          })),
        });
      }

      return spot;
    });

    return jsonResponse(
      {
        id: result.id,
        status: result.status,
      },
      201
    );
  } catch (error) {
    console.error("[POST /api/spots] DB エラー", error);
    return errorResponse("スポットの保存に失敗しました。", {
      status: 500,
      code: "SERVER_ERROR",
    });
  }
}
