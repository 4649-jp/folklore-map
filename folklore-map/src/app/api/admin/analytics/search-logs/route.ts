import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasRole, getUserRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/admin/analytics/search-logs
 * 検索ログ集計（検索ワード、フィルタ、件数、期間指定）
 */
export async function GET(request: Request) {
  try {
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

    const where: any = {};
    if (startDate) {
      where.searched_at = { gte: new Date(startDate) };
    }
    if (endDate) {
      if (where.searched_at) {
        where.searched_at.lte = new Date(endDate);
      } else {
        where.searched_at = { lte: new Date(endDate) };
      }
    }

    // 検索ログを取得
    const [logs, total] = await Promise.all([
      prisma.searchLog.findMany({
        where,
        orderBy: { searched_at: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.searchLog.count({ where }),
    ]);

    // キーワード集計（上位20件）
    const keywordStats = await prisma.searchLog.groupBy({
      by: ["keyword"],
      where: {
        ...where,
        keyword: { not: null },
      },
      _count: { keyword: true },
      orderBy: { _count: { keyword: "desc" } },
      take: 20,
    });

    // アイコンタイプ集計
    const iconTypeStats = await prisma.searchLog.groupBy({
      by: ["icon_types"],
      where: {
        ...where,
        icon_types: { not: null },
      },
      _count: { icon_types: true },
      orderBy: { _count: { icon_types: "desc" } },
    });

    // 時代フィルタ集計
    const eraStats = await prisma.searchLog.groupBy({
      by: ["era"],
      where: {
        ...where,
        era: { not: null },
      },
      _count: { era: true },
      orderBy: { _count: { era: "desc" } },
    });

    return NextResponse.json({
      data: {
        logs,
        total,
        limit,
        offset,
        aggregations: {
          keywords: keywordStats.map((item) => ({
            keyword: item.keyword,
            count: item._count.keyword,
          })),
          iconTypes: iconTypeStats.map((item) => ({
            iconType: item.icon_types,
            count: item._count.icon_types,
          })),
          eras: eraStats.map((item) => ({
            era: item.era,
            count: item._count.era,
          })),
        },
      },
    });
  } catch (error) {
    console.error("[API] Search logs error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "検索ログの取得に失敗しました",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/analytics/search-logs
 * 検索ログを記録
 */
export async function POST(request: Request) {
  try {
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

    const body = await request.json();
    const { keyword, icon_types, era, status, results_count, user_id, session_id } = body;

    await prisma.searchLog.create({
      data: {
        keyword: keyword || null,
        icon_types: icon_types ? JSON.stringify(icon_types) : null,
        era: era || null,
        status: status || null,
        results_count: results_count || 0,
        user_id: user_id || null,
        session_id: session_id || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Search log creation error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "検索ログの記録に失敗しました",
        },
      },
      { status: 500 }
    );
  }
}
