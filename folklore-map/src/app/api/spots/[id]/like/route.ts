import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * GET /api/spots/:id/like
 * スポットのいいね数を取得
 */
export async function GET(
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

    // いいね数を取得
    const likeCount = await prisma.spotInteraction.count({
      where: {
        spot_id: id,
        type: "LIKE",
      },
    });

    return NextResponse.json({
      data: {
        spot_id: id,
        like_count: likeCount,
      },
    });
  } catch (error) {
    console.error("[API] Get like count error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "いいね数の取得に失敗しました",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/spots/:id/like
 * スポットにいいねを追加（トグル）- 認証必須
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

    // 既存のいいねを確認（user_idで検索）
    const existingLike = await prisma.spotInteraction.findFirst({
      where: {
        spot_id: id,
        user_id: userId,
        type: "LIKE",
      },
    });

    if (existingLike) {
      // 既にいいねしている場合は削除（トグル）
      await prisma.spotInteraction.delete({
        where: {
          id: existingLike.id,
        },
      });

      // 新しいいいね数を取得
      const likeCount = await prisma.spotInteraction.count({
        where: {
          spot_id: id,
          type: "LIKE",
        },
      });

      return NextResponse.json({
        data: {
          liked: false,
          like_count: likeCount,
        },
      });
    } else {
      // いいねを追加（user_idを使用）
      await prisma.spotInteraction.create({
        data: {
          spot_id: id,
          user_id: userId,
          type: "LIKE",
        },
      });

      // 新しいいいね数を取得
      const likeCount = await prisma.spotInteraction.count({
        where: {
          spot_id: id,
          type: "LIKE",
        },
      });

      return NextResponse.json({
        data: {
          liked: true,
          like_count: likeCount,
        },
      });
    }
  } catch (error) {
    console.error("[API] Like error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "いいねの処理に失敗しました",
        },
      },
      { status: 500 }
    );
  }
}
