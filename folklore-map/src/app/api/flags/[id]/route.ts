import type { NextRequest } from "next/server";

import { prisma } from "@/lib/db";
import { errorResponse, jsonResponse, zodErrorResponse } from "@/lib/http";
import { FlagUpdateSchema } from "@/lib/schemas/flags";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserRole, hasRole } from "@/lib/auth";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;

  // 常に権限チェックを実施
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const role = getUserRole(session);
  if (!hasRole("reviewer", role)) {
    return errorResponse("通報の更新権限がありません。", {
      status: 403,
      code: "FORBIDDEN",
    });
  }

  const json = await request.json().catch(() => null);
  if (!json) {
    return errorResponse("JSON ボディが必要です。", {
      status: 400,
      code: "INVALID_BODY",
    });
  }

  const parsed = FlagUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return zodErrorResponse(parsed.error);
  }

  const flag = await prisma.flag.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!flag) {
    return errorResponse("通報が見つかりませんでした。", {
      status: 404,
      code: "NOT_FOUND",
    });
  }

  const updated = await prisma.flag.update({
    where: { id },
    data: {
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.note !== undefined ? { note: parsed.data.note ?? null } : {}),
    },
    select: {
      id: true,
      status: true,
      note: true,
    },
  });

  return jsonResponse(updated);
}
