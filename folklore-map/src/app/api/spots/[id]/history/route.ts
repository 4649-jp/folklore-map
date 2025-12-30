import type { NextRequest } from "next/server";

import { prisma } from "@/lib/db";
import { errorResponse, jsonResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserRole, hasRole } from "@/lib/auth";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  // 認証チェック
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const role = getUserRole(session);
  const userId = session?.user.id ?? null;

  if (!userId) {
    return errorResponse("ログインが必要です。", {
      status: 401,
      code: "UNAUTHORIZED",
    });
  }

  // スポットの存在確認と権限チェック
  const spot = await prisma.spot.findUnique({
    where: { id },
  });

  if (!spot) {
    return errorResponse("スポットが見つかりませんでした。", {
      status: 404,
      code: "NOT_FOUND",
    });
  }

  // 履歴は作成者またはreviewer以上のみ閲覧可能
  const isOwner = spot.created_by === userId;
  const canView = isOwner || hasRole("reviewer", role);

  if (!canView) {
    return errorResponse("履歴を閲覧する権限がありません。", {
      status: 403,
      code: "FORBIDDEN",
    });
  }

  // Auditテーブルから変更履歴を取得
  const audits = await prisma.audit.findMany({
    where: {
      entity: "Spot",
      entity_id: id,
      action: "UPDATE",
    },
    orderBy: {
      at: "desc",
    },
    take: 50, // 最新50件まで
  });

  // 変更履歴をフォーマット
  const history = audits.map((audit) => {
    const detail = audit.detail_json as Record<string, unknown> | null;
    return {
      id: audit.id,
      timestamp: audit.at.toISOString(),
      user_id: audit.by,
      changes: detail?.changes || {},
      previous: detail?.previous || {},
    };
  });

  return jsonResponse({
    spot_id: id,
    history,
  });
}
