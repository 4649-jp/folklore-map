import type { NextRequest } from "next/server";

import { prisma } from "@/lib/db";
import { errorResponse, jsonResponse, zodErrorResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserRole, hasRole, type UserRole } from "@/lib/auth";
import { SpotUpdateSchema } from "@/lib/schemas/spots";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  let role: UserRole = "viewer";
  let userId: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    role = getUserRole(session);
    userId = session?.user.id ?? null;
  } catch (error) {
    console.warn("[GET /api/spots/:id] Supabase セッション取得に失敗しました", error);
  }

  const spot = await prisma.spot.findUnique({
    where: { id },
    include: {
      sources: true,
    },
  });

  if (!spot) {
    return errorResponse("スポットが見つかりませんでした。", {
      status: 404,
      code: "NOT_FOUND",
    });
  }

  const isOwner = userId && spot.created_by === userId;
  const canView =
    spot.status === "PUBLISHED" ||
    isOwner ||
    hasRole("reviewer", role) ||
    hasRole("admin", role);

  if (!canView) {
    return errorResponse("閲覧権限がありません。", {
      status: 403,
      code: "FORBIDDEN",
    });
  }

  return jsonResponse({
    id: spot.id,
    title: spot.title,
    description: spot.description,
    address: spot.address,
    maps_query: spot.maps_query,
    maps_place_id: spot.maps_place_id,
    icon_type: spot.icon_type,
    lat: spot.lat,
    lng: spot.lng,
    era_hint: spot.era_hint,
    status: spot.status,
    updated_at: spot.updated_at,
    created_by: spot.created_by,
    sources: spot.sources.map((source) => ({
      id: source.id,
      type: source.type,
      citation: source.citation,
      url: source.url,
    })),
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;

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

  const spot = await prisma.spot.findUnique({
    where: { id },
  });

  if (!spot) {
    return errorResponse("スポットが見つかりませんでした。", {
      status: 404,
      code: "NOT_FOUND",
    });
  }

  if (
    !hasRole("reviewer", role) &&
    (spot.created_by !== userId || spot.status === "PUBLISHED")
  ) {
    return errorResponse("このスポットを更新する権限がありません。", {
      status: 403,
      code: "FORBIDDEN",
    });
  }

  const json = await request.json().catch(() => null);
  if (!json) {
    return errorResponse("JSON ボディが必要です。", {
      status: 400,
      code: "INVALID_BODY",
    });
  }

  const parsed = SpotUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return zodErrorResponse(parsed.error);
  }

  const data = parsed.data;
  const updateData: Record<string, unknown> = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.maps_query !== undefined) updateData.maps_query = data.maps_query;
  if (data.maps_place_id !== undefined) updateData.maps_place_id = data.maps_place_id;
  if (data.icon_type !== undefined) updateData.icon_type = data.icon_type;
  if (data.lat !== undefined) updateData.lat = data.lat;
  if (data.lng !== undefined) updateData.lng = data.lng;
  if (data.era_hint !== undefined) updateData.era_hint = data.era_hint;

  if (data.status !== undefined) {
    const canReviewerChange = hasRole("reviewer", role);
    const canOwnerSubmit =
      !canReviewerChange &&
      spot.created_by === userId &&
      spot.status !== "PUBLISHED" &&
      data.status !== "PUBLISHED";

    if (!canReviewerChange && !canOwnerSubmit) {
      return errorResponse("ステータスを変更する権限がありません。", {
        status: 403,
        code: "FORBIDDEN",
      });
    }
    updateData.status = data.status;
  }

  if (Object.keys(updateData).length === 0) {
    return errorResponse("更新対象のフィールドがありません。", {
      status: 400,
      code: "NO_UPDATE_FIELDS",
    });
  }

  try {
    // 変更前の値を保存するために現在の値を取得
    const previousValues: Record<string, unknown> = {};
    const changes: Record<string, unknown> = {};

    for (const key of Object.keys(updateData)) {
      previousValues[key] = spot[key as keyof typeof spot];
      changes[key] = updateData[key];
    }

    const updated = await prisma.spot.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        title: true,
        status: true,
        updated_at: true,
      },
    });

    // Auditログを記録
    await prisma.audit.create({
      data: {
        entity: "Spot",
        entity_id: id,
        action: "UPDATE",
        by: userId,
        detail_json: {
          changes: JSON.parse(JSON.stringify(changes)),
          previous: JSON.parse(JSON.stringify(previousValues)),
        },
      },
    });

    return jsonResponse(updated);
  } catch (error) {
    console.error("[PATCH /api/spots/:id] 更新失敗", error);
    return errorResponse("スポットの更新に失敗しました。", {
      status: 500,
      code: "SERVER_ERROR",
    });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;

  // 認証チェック（管理者のみ削除可能）
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

  if (!hasRole("admin", role)) {
    return errorResponse("削除権限がありません。", {
      status: 403,
      code: "FORBIDDEN",
    });
  }

  // スポットの存在確認
  const spot = await prisma.spot.findUnique({
    where: { id },
  });

  if (!spot) {
    return errorResponse("スポットが見つかりませんでした。", {
      status: 404,
      code: "NOT_FOUND",
    });
  }

  try {
    // 関連する Source と Flag も自動削除される（Cascade設定）
    await prisma.spot.delete({
      where: { id },
    });

    return jsonResponse(
      {
        success: true,
        message: "スポットを削除しました。",
      },
      200
    );
  } catch (error) {
    console.error("[DELETE /api/spots/:id] 削除失敗", error);
    return errorResponse("スポットの削除に失敗しました。", {
      status: 500,
      code: "SERVER_ERROR",
    });
  }
}
