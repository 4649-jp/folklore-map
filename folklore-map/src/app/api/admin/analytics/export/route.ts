import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasRole, getUserRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/admin/analytics/export
 * 分析データのCSVエクスポート
 * ?type=spot-history | search-logs | popularity
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

    const { searchParams } = new URL(request.url);
    const exportType = searchParams.get("type");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    let csvContent = "";
    let filename = "";

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

    if (exportType === "spot-history") {
      // スポット追加履歴のCSV
      const spots = await prisma.spot.findMany({
        where: dateFilter.gte || dateFilter.lte ? { created_at: dateFilter } : {},
        select: {
          id: true,
          title: true,
          created_by: true,
          created_at: true,
          status: true,
          icon_type: true,
        },
        orderBy: { created_at: "desc" },
      });

      csvContent =
        "スポットID,タイトル,追加者,追加日時,ステータス,アイコンタイプ\n";
      spots.forEach((spot) => {
        csvContent += `"${spot.id}","${spot.title}","${spot.created_by}","${spot.created_at.toISOString()}","${spot.status}","${spot.icon_type}"\n`;
      });

      filename = `spot-history-${new Date().toISOString().split("T")[0]}.csv`;
    } else if (exportType === "search-logs") {
      // 検索ログのCSV
      const logs = await prisma.searchLog.findMany({
        where: dateFilter.gte || dateFilter.lte ? { searched_at: dateFilter } : {},
        orderBy: { searched_at: "desc" },
      });

      csvContent =
        "検索ID,キーワード,アイコンタイプ,時代,ステータス,結果件数,ユーザーID,検索日時\n";
      logs.forEach((log) => {
        csvContent += `"${log.id}","${log.keyword || ""}","${log.icon_types || ""}","${log.era || ""}","${log.status || ""}","${log.results_count}","${log.user_id || ""}","${log.searched_at.toISOString()}"\n`;
      });

      filename = `search-logs-${new Date().toISOString().split("T")[0]}.csv`;
    } else if (exportType === "popularity") {
      // 人気指標のCSV
      const viewStats = await prisma.spotView.groupBy({
        by: ["spot_id"],
        where: dateFilter.gte || dateFilter.lte ? { viewed_at: dateFilter } : {},
        _count: { spot_id: true },
        _avg: { duration_ms: true },
      });

      const likeStats = await prisma.spotInteraction.groupBy({
        by: ["spot_id"],
        where: {
          type: "LIKE",
          ...(dateFilter.gte || dateFilter.lte ? { created_at: dateFilter } : {}),
        },
        _count: { spot_id: true },
      });

      const saveStats = await prisma.spotInteraction.groupBy({
        by: ["spot_id"],
        where: {
          type: "SAVE",
          ...(dateFilter.gte || dateFilter.lte ? { created_at: dateFilter } : {}),
        },
        _count: { spot_id: true },
      });

      const shareStats = await prisma.spotInteraction.groupBy({
        by: ["spot_id"],
        where: {
          type: "SHARE",
          ...(dateFilter.gte || dateFilter.lte ? { created_at: dateFilter } : {}),
        },
        _count: { spot_id: true },
      });

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
        },
      });

      const spotMap = new Map(spots.map((spot) => [spot.id, spot]));

      csvContent =
        "スポットID,タイトル,アイコンタイプ,ステータス,閲覧数,平均滞在時間(ms),いいね数,保存数,シェア数\n";

      spotIds.forEach((spotId) => {
        const spot = spotMap.get(spotId);
        const views = viewStats.find((s) => s.spot_id === spotId);
        const likes = likeStats.find((s) => s.spot_id === spotId);
        const saves = saveStats.find((s) => s.spot_id === spotId);
        const shares = shareStats.find((s) => s.spot_id === spotId);

        csvContent += `"${spotId}","${spot?.title || "不明"}","${spot?.icon_type || "GENERIC"}","${spot?.status || "DRAFT"}","${views?._count.spot_id || 0}","${Math.round(views?._avg.duration_ms || 0)}","${likes?._count.spot_id || 0}","${saves?._count.spot_id || 0}","${shares?._count.spot_id || 0}"\n`;
      });

      filename = `popularity-${new Date().toISOString().split("T")[0]}.csv`;
    } else {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_TYPE",
            message:
              "無効なエクスポートタイプです。spot-history, search-logs, または popularity を指定してください。",
          },
        },
        { status: 400 }
      );
    }

    // CSVレスポンスを返す
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[API] Export error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "エクスポートに失敗しました",
        },
      },
      { status: 500 }
    );
  }
}
