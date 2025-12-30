-- Supabase RLS ポリシー定義
-- 実際に適用する前に、既存ポリシーとの重複や競合がないことを確認してください。

-- 公開スポットは誰でも閲覧可能
create policy "public can read published spots"
on public."Spot"
for select
using (status = 'PUBLISHED');

-- 編集者は自分の下書きを閲覧・編集可能（DRAFT, REVIEW）
create policy "owner can read drafts"
on public."Spot"
for select using (
  auth.uid() = created_by
  and status in ('DRAFT','REVIEW')
);

create policy "owner can update drafts"
on public."Spot"
for update using (
  auth.uid() = created_by
  and status in ('DRAFT','REVIEW')
);

-- レビュワー以上は全件参照・更新可能（JWT の claim -> role を参照）
create policy "reviewer can manage all spots"
on public."Spot"
for all using (
  coalesce(auth.jwt() ->> 'role', '') in ('reviewer','admin')
);

-- Source/Flag/Audit の参照は紐づく Spot の可視性に追随
create policy "public can read sources on published spots"
on public."Source"
for select using (
  exists(
    select 1
    from public."Spot" s
    where s.id = spot_id
      and (
        s.status = 'PUBLISHED'
        or s.created_by = auth.uid()
        or coalesce(auth.jwt() ->> 'role', '') in ('reviewer','admin')
      )
  )
);

create policy "public can read flags on published spots"
on public."Flag"
for select using (
  exists(
    select 1
    from public."Spot" s
    where s.id = spot_id
      and (
        s.status = 'PUBLISHED'
        or coalesce(auth.jwt() ->> 'role', '') in ('reviewer','admin')
      )
  )
);

-- 通報は匿名ユーザーでも作成可能（Recaptcha などの追加対策推奨）
create policy "anyone can create flags"
on public."Flag"
for insert with check (true);

-- レビュワー以上は通報の更新が可能
create policy "reviewer can update flags"
on public."Flag"
for update using (
  coalesce(auth.jwt() ->> 'role', '') in ('reviewer','admin')
);

-- 監査ログはレビュワー以上のみ閲覧
create policy "reviewer can read audits"
on public."Audit"
for select using (
  coalesce(auth.jwt() ->> 'role', '') in ('reviewer','admin')
);
