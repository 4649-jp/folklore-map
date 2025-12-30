import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * POST /api/spots/:id/share
 * スポットのシェアを記録 - 認証必須
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting: 30 requests per minute per IP
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitResult = rateLimit(
      `interaction:${clientIp}`,
      RATE_LIMITS.INTERACTION
    );

    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response;
    }

    const { id } = await context.params;

    // 認証チェック
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "ログインが必要です",
          },
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // シェアを記録（user_idを使用）
    await prisma.spotInteraction.create({
      data: {
        spot_id: id,
        user_id: userId,
        type: "SHARE",
      },
    });

    // シェア数を取得
    const shareCount = await prisma.spotInteraction.count({
      where: {
        spot_id: id,
        type: "SHARE",
      },
    });

    return NextResponse.json({
      data: {
        share_count: shareCount,
      },
    });
  } catch (error) {
    console.error("[API] Share error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "シェアの記録に失敗しました",
        },
      },
      { status: 500 }
    );
  }
}
