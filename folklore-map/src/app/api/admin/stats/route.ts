import { NextRequest } from "next/server";
import { getUserRole, hasRole } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/http";
import { prisma } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    // 常に管理者権限チェックを実施
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const role = getUserRole(session);
    if (!hasRole("admin", role)) {
      return errorResponse("管理者権限が必要です", {
        status: 403,
        code: "FORBIDDEN",
      });
    }

    // スポット統計
    const totalSpots = await prisma.spot.count();
    const spotsByStatus = await prisma.spot.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    const spotsByIcon = await prisma.spot.groupBy({
      by: ["icon_type"],
      _count: { icon_type: true },
    });

    // 通報統計
    const totalFlags = await prisma.flag.count();
    const openFlags = await prisma.flag.count({
      where: { status: "OPEN" },
    });

    const flagsByReason = await prisma.flag.groupBy({
      by: ["reason"],
      _count: { reason: true },
    });

    const closedFlags = totalFlags - openFlags;

    // 最近の活動（最新10件のスポット）
    const recentSpots = await prisma.spot.findMany({
      take: 10,
      orderBy: { updated_at: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        updated_at: true,
        created_by: true,
      },
    });

    // 最近の5件の通報
    const recentFlags = await prisma.flag.findMany({
      take: 5,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
        spot: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // 過去30日間のスポット更新数（時系列）
    // Note: Spotモデルにはcreated_atがないため、updated_atを使用
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const spotsUpdatedByDate = await prisma.spot.findMany({
      where: {
        updated_at: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        updated_at: true,
      },
    });

    // 日付ごとにグループ化
    const spotsByDate = spotsUpdatedByDate.reduce(
      (acc, spot) => {
        const date = new Date(spot.updated_at).toLocaleDateString("ja-JP");
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // レビュー待ちのスポット数
    const reviewWaitingSpots = await prisma.spot.count({
      where: { status: "REVIEW" },
    });

    // ステータス別の割合（パーセンテージ）
    const statusPercentages = spotsByStatus.reduce(
      (acc, g) => {
        acc[g.status] = totalSpots > 0 ? Math.round((g._count.status / totalSpots) * 100) : 0;
        return acc;
      },
      {} as Record<string, number>
    );

    return jsonResponse({
      spots: {
        total: totalSpots,
        byStatus: spotsByStatus.reduce((acc, g) => {
          acc[g.status] = g._count.status;
          return acc;
        }, {} as Record<string, number>),
        byIcon: spotsByIcon.reduce((acc, g) => {
          acc[g.icon_type] = g._count.icon_type;
          return acc;
        }, {} as Record<string, number>),
        statusPercentages,
        reviewWaiting: reviewWaitingSpots,
        createdByDate: spotsByDate,
      },
      flags: {
        total: totalFlags,
        open: openFlags,
        closed: closedFlags,
        byReason: flagsByReason.reduce((acc, g) => {
          acc[g.reason] = g._count.reason;
          return acc;
        }, {} as Record<string, number>),
      },
      recent: {
        spots: recentSpots,
        flags: recentFlags,
      },
    });
  } catch (error) {
    console.error("管理者統計取得エラー:", error);
    return errorResponse("統計の取得に失敗しました", {
      status: 500,
      code: "INTERNAL_ERROR",
    });
  }
}
