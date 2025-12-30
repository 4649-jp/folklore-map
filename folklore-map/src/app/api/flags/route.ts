import type { NextRequest } from "next/server";

import { prisma } from "@/lib/db";
import { errorResponse, jsonResponse, zodErrorResponse } from "@/lib/http";
import { FlagCreateSchema } from "@/lib/schemas/flags";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserRole, hasRole } from "@/lib/auth";
import { rateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  // 常に権限チェックを実施
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const role = getUserRole(session);
  if (!hasRole("reviewer", role)) {
    return errorResponse("通報の閲覧権限がありません。", {
      status: 403,
      code: "FORBIDDEN",
    });
  }

  try {
    const flags = await prisma.flag.findMany({
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        reason: true,
        status: true,
        note: true,
        created_at: true,
        spot: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return jsonResponse({
      flags,
    });
  } catch (error) {
    console.error("[GET /api/flags] DB エラー", error);
    return errorResponse("通報の取得に失敗しました。", {
      status: 500,
      code: "SERVER_ERROR",
    });
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting: 5 requests per minute per IP (prevent spam)
  const clientIp = getClientIp(request);
  const rateLimitResult = rateLimit(
    `flag-create:${clientIp}`,
    RATE_LIMITS.FLAG_CREATE
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

  const parsed = FlagCreateSchema.safeParse(json);
  if (!parsed.success) {
    return zodErrorResponse(parsed.error);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const role = getUserRole(session);
  const userId = session?.user.id ?? null;

  // 対象スポットが存在し、公開中/閲覧許可があるか軽くチェック
  const spot = await prisma.spot.findUnique({
    where: { id: parsed.data.spot_id },
    select: { id: true, status: true, created_by: true },
  });
  if (!spot) {
    return errorResponse("対象スポットが存在しません。", {
      status: 404,
      code: "SPOT_NOT_FOUND",
    });
  }

  const isOwner = userId && spot.created_by === userId;
  const canFlag =
    spot.status === "PUBLISHED" || isOwner || role !== "viewer";

  if (!canFlag) {
    return errorResponse("通報権限がありません。", {
      status: 403,
      code: "FORBIDDEN",
    });
  }

  try {
    const flag = await prisma.flag.create({
      data: {
        spot_id: parsed.data.spot_id,
        reason: parsed.data.reason,
        note: parsed.data.note ?? null,
        created_by: userId ?? "anonymous",
        status: "OPEN",
      },
      select: {
        id: true,
        status: true,
      },
    });

    return jsonResponse(flag, 201);
  } catch (error) {
    console.error("[POST /api/flags] DB エラー", error);
    return errorResponse("通報の登録に失敗しました。", {
      status: 500,
      code: "SERVER_ERROR",
    });
  }
}
