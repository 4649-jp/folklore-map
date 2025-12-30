import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasRole, getUserRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/admin/analytics/spot-history
 * スポット追加履歴を取得（追加日時、追加者、スポットID/名称）
 */
export async function GET(request: Request) {
  try {
    // 認証チェック（reviewer以上のみアクセス可能）
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "認証が必要です" } },
        { status: 401 }
      );
    }

    const role = getUserRole(user);
    if (!hasRole("reviewer", role)) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "この操作にはreviewer以上の権限が必要です",
          },
        },
        { status: 403 }
      );
    }

    // URLパラメータから期間フィルターを取得
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // スポット追加履歴を取得
    const where: any = {};
    if (startDate) {
      where.created_at = { gte: new Date(startDate) };
    }
    if (endDate) {
      if (where.created_at) {
        where.created_at.lte = new Date(endDate);
      } else {
        where.created_at = { lte: new Date(endDate) };
      }
    }

    const [spots, total] = await Promise.all([
      prisma.spot.findMany({
        where,
        select: {
          id: true,
          title: true,
          created_by: true,
          created_at: true,
          status: true,
          icon_type: true,
        },
        orderBy: { created_at: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.spot.count({ where }),
    ]);

    return NextResponse.json({
      data: {
        spots,
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("[API] Spot history error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "履歴の取得に失敗しました",
        },
      },
      { status: 500 }
    );
  }
}
