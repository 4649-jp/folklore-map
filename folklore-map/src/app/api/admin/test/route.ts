import { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/http";
import { prisma } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserRole, hasRole } from "@/lib/auth";

// テスト用エンドポイント（管理者限定）
export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return errorResponse("認証が必要です", { status: 401, code: "UNAUTHORIZED" });
    }

    const role = getUserRole(session);
    if (!hasRole("admin", role)) {
      return errorResponse("管理者権限が必要です", { status: 403, code: "FORBIDDEN" });
    }

    // スポット数を取得
    const totalSpots = await prisma.spot.count();

    // 最初の5件を取得
    const spots = await prisma.spot.findMany({
      take: 5,
      orderBy: { updated_at: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        updated_at: true,
      },
    });

    return jsonResponse({
      success: true,
      message: "データベース接続成功",
      data: {
        totalSpots,
        sampleSpots: spots,
      },
    });
  } catch (error) {
    console.error("テストエンドポイントエラー:", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "不明なエラー",
      },
      500
    );
  }
}
