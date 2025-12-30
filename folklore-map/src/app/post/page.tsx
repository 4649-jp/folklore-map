import { redirect } from "next/navigation";
import { SpotForm } from "@/components/spot-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PostPage() {
  // 一時的に認証チェックを無効化
  // const supabase = await createSupabaseServerClient();
  // const {
  //   data: { session },
  // } = await supabase.auth.getSession();

  // if (!session) {
  //   redirect("/login");
  // }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <div className="space-y-3">
        <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
          投稿フォーム
        </span>
        <h1 className="text-3xl font-bold">新しいスポットを追加する</h1>
        <p className="text-sm text-muted-foreground">
          【開発モード】ログインなしで投稿できます。送信後はレビュワーが内容を確認し、問題がなければ公開されます。 差別的表現や個人情報が含まれる場合は修正されることがあります。
        </p>
      </div>

      <SpotForm />
    </div>
  );
}
