import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasRole, getUserRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/admin/analytics/popularity
 * コンテンツ人気指標（閲覧数、いいね、保存、滞在時間）
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
    const limit = parseInt(searchParams.get("limit") || "20");

    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      if (dateFilter.gte) {
        dateFilter.lte = new Date(endDate);
      } else {
        dateFilter.lte = new Date(endDate);
      }
    }

    // 閲覧数の集計
    const viewStats = await prisma.spotView.groupBy({
      by: ["spot_id"],
      where: dateFilter.gte || dateFilter.lte ? { viewed_at: dateFilter } : {},
      _count: { spot_id: true },
      _avg: { duration_ms: true },
      orderBy: { _count: { spot_id: "desc" } },
      take: limit,
    });

    // いいね数の集計
    const likeStats = await prisma.spotInteraction.groupBy({
      by: ["spot_id"],
      where: {
        type: "LIKE",
        ...(dateFilter.gte || dateFilter.lte ? { created_at: dateFilter } : {}),
      },
      _count: { spot_id: true },
      orderBy: { _count: { spot_id: "desc" } },
      take: limit,
    });

    // 保存数の集計
    const saveStats = await prisma.spotInteraction.groupBy({
      by: ["spot_id"],
      where: {
        type: "SAVE",
        ...(dateFilter.gte || dateFilter.lte ? { created_at: dateFilter } : {}),
      },
      _count: { spot_id: true },
      orderBy: { _count: { spot_id: "desc" } },
      take: limit,
    });

    // シェア数の集計
    const shareStats = await prisma.spotInteraction.groupBy({
      by: ["spot_id"],
      where: {
        type: "SHARE",
        ...(dateFilter.gte || dateFilter.lte ? { created_at: dateFilter } : {}),
      },
      _count: { spot_id: true },
      orderBy: { _count: { spot_id: "desc" } },
      take: limit,
    });

    // スポット情報を取得
    const spotIds = [
      ...new Set([
        ...viewStats.map((s) => s.spot_id),
        ...likeStats.map((s) => s.spot_id),
        ...saveStats.map((s) => s.spot_id),
        ...shareStats.map((s) => s.spot_id),
      ]),
    ];

    const spots = await prisma.spot.findMany({
      where: { id: { in: spotIds } },
      select: {
        id: true,
        title: true,
        icon_type: true,
        status: true,
        created_at: true,
      },
    });

    const spotMap = new Map(spots.map((spot) => [spot.id, spot]));

    // 統合されたランキングを作成
    const popularityData = spotIds.map((spotId) => {
      const spot = spotMap.get(spotId);
      const views = viewStats.find((s) => s.spot_id === spotId);
      const likes = likeStats.find((s) => s.spot_id === spotId);
      const saves = saveStats.find((s) => s.spot_id === spotId);
      const shares = shareStats.find((s) => s.spot_id === spotId);

      return {
        spot_id: spotId,
        spot_title: spot?.title || "不明",
        spot_icon_type: spot?.icon_type || "GENERIC",
        spot_status: spot?.status || "DRAFT",
        spot_created_at: spot?.created_at || null,
        view_count: views?._count.spot_id || 0,
        avg_duration_ms: views?._avg.duration_ms || 0,
        like_count: likes?._count.spot_id || 0,
        save_count: saves?._count.spot_id || 0,
        share_count: shares?._count.spot_id || 0,
        total_interactions:
          (likes?._count.spot_id || 0) +
          (saves?._count.spot_id || 0) +
          (shares?._count.spot_id || 0),
      };
    });

    // 総インタラクション数でソート
    popularityData.sort((a, b) => {
      const scoreA = a.view_count + a.total_interactions * 2;
      const scoreB = b.view_count + b.total_interactions * 2;
      return scoreB - scoreA;
    });

    return NextResponse.json({
      data: {
        popularity: popularityData.slice(0, limit),
        summary: {
          total_views: viewStats.reduce((sum, s) => sum + s._count.spot_id, 0),
          total_likes: likeStats.reduce((sum, s) => sum + s._count.spot_id, 0),
          total_saves: saveStats.reduce((sum, s) => sum + s._count.spot_id, 0),
          total_shares: shareStats.reduce(
            (sum, s) => sum + s._count.spot_id,
            0
          ),
        },
      },
    });
  } catch (error) {
    console.error("[API] Popularity metrics error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "人気指標の取得に失敗しました",
        },
      },
      { status: 500 }
    );
  }
}
