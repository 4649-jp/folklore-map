import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ReviewPanel } from "@/components/review-panel";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserRole, hasRole } from "@/lib/auth";

export const revalidate = 60;

export default async function ReviewPage() {
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
  const spots = await prisma.spot.findMany({
    where: {
      status: {
        in: ["DRAFT", "REVIEW"],
      },
    },
    include: {
      sources: true,
    },
    orderBy: {
      updated_at: "desc",
    },
    take: 100,
  });

  const forReview = spots.map((spot) => ({
    id: spot.id,
    title: spot.title,
    description: spot.description,
    icon_type: spot.icon_type,
    lat: spot.lat,
    lng: spot.lng,
    era_hint: spot.era_hint,
    status: spot.status,
    created_by: spot.created_by,
    updated_at: spot.updated_at.toISOString(),
    sources: spot.sources.map((source) => ({
      id: source.id,
      type: source.type,
      citation: source.citation,
      url: source.url,
    })),
  }));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <div className="space-y-3">
        <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
          レビューパネル
        </span>
        <h1 className="text-3xl font-bold">承認・レビュー画面</h1>
        <p className="text-sm text-muted-foreground">
          下書きとレビュー待ちの投稿を一覧で確認し、公開または差戻しの操作を行います。操作にはレビュワー権限が必要です。
        </p>
      </div>

      <ReviewPanel initialSpots={forReview} />
    </div>
  );
}
