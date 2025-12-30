import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * POST /api/spots/:id/view
 * スポットの閲覧を記録 - 認証必須
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
    const body = await request.json();
    const { duration_ms } = body;

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

    // 閲覧を記録（user_idを使用）
    await prisma.spotView.create({
      data: {
        spot_id: id,
        user_id: userId,
        duration_ms: duration_ms || null,
      },
    });

    return NextResponse.json({
      data: {
        success: true,
      },
    });
  } catch (error) {
    console.error("[API] View error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "閲覧の記録に失敗しました",
        },
      },
      { status: 500 }
    );
  }
}
