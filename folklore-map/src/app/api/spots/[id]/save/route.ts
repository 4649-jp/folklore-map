import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * GET /api/spots/:id/save
 * スポットの保存数を取得
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

    // 保存数を取得
    const saveCount = await prisma.spotInteraction.count({
      where: {
        spot_id: id,
        type: "SAVE",
      },
    });

    return NextResponse.json({
      data: {
        spot_id: id,
        save_count: saveCount,
      },
    });
  } catch (error) {
    console.error("[API] Get save count error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "保存数の取得に失敗しました",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/spots/:id/save
 * スポットを保存/削除（トグル） - 認証必須
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

    // 既存の保存を確認
    const existingSave = await prisma.spotInteraction.findFirst({
      where: {
        spot_id: id,
        user_id: userId,
        type: "SAVE",
      },
    });

    if (existingSave) {
      // 既に保存している場合は削除（トグル）
      await prisma.spotInteraction.delete({
        where: {
          id: existingSave.id,
        },
      });

      // 新しい保存数を取得
      const saveCount = await prisma.spotInteraction.count({
        where: {
          spot_id: id,
          type: "SAVE",
        },
      });

      return NextResponse.json({
        data: {
          saved: false,
          save_count: saveCount,
        },
      });
    } else {
      // 保存を追加（user_idを使用）
      await prisma.spotInteraction.create({
        data: {
          spot_id: id,
          user_id: userId,
          type: "SAVE",
        },
      });

      // 新しい保存数を取得
      const saveCount = await prisma.spotInteraction.count({
        where: {
          spot_id: id,
          type: "SAVE",
        },
      });

      return NextResponse.json({
        data: {
          saved: true,
          save_count: saveCount,
        },
      });
    }
  } catch (error) {
    console.error("[API] Save error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "保存の処理に失敗しました",
        },
      },
      { status: 500 }
    );
  }
}
