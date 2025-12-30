import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { FlagList } from "@/components/flag-list";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserRole, hasRole } from "@/lib/auth";

export const revalidate = 60;

export default async function FlagsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const role = getUserRole(session);
  if (!hasRole("reviewer", role)) {
    redirect("/");
  }
  const flags = await prisma.flag.findMany({
    where: {
      status: "OPEN",
    },
    include: {
      spot: {
        select: {
          title: true,
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
    take: 100,
  });

  const flagItems = flags.map((flag) => ({
    id: flag.id,
    spot_id: flag.spot_id,
    spot_title: flag.spot.title,
    reason: flag.reason,
    note: flag.note,
    status: flag.status,
    created_at: flag.created_at.toISOString(),
    created_by: flag.created_by,
  }));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <div className="space-y-3">
        <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
          通報対応
        </span>
        <h1 className="text-3xl font-bold">通報一覧</h1>
        <p className="text-sm text-muted-foreground">
          不適切・誤情報・差別・プライバシーに関する通報を確認して対応状況を更新します。
        </p>
      </div>

      <FlagList initialFlags={flagItems} />
    </div>
  );
}
