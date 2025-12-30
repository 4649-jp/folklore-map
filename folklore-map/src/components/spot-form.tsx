"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { cn } from "@/lib/utils";
import { SpotCreateSchema } from "@/lib/schemas/spots";

const FormSchema = z
  .object({
    title: SpotCreateSchema.shape.title,
    description: SpotCreateSchema.shape.description,
    address: SpotCreateSchema.shape.address,
    icon_type: SpotCreateSchema.shape.icon_type,
    era_hint: z.string().max(120).optional(),
    source_type: z.enum(["URL", "BOOK", "INTERVIEW"]),
    source_citation: z.string().min(3, "出典情報を入力してください。"),
    source_url: z.string().url("正しい URL を入力してください。").optional().or(z.literal("")),
  })
  .refine(
    (value) =>
      value.source_type !== "URL" || Boolean(value.source_url && value.source_url !== ""),
    {
      path: ["source_url"],
      message: "出典タイプが URL の場合は URL を入力してください。",
    }
  );

type FormValues = z.infer<typeof FormSchema>;

type Status =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success"; message: string }
  | { state: "error"; message: string };

export function SpotForm() {
  const [status, setStatus] = useState<Status>({ state: "idle" });

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: "",
      description: "",
      address: "",
      icon_type: "GENERIC",
      era_hint: "",
      source_type: "URL",
      source_citation: "",
      source_url: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setStatus({ state: "submitting" });

    const geocodeRes = await fetch("/api/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: values.address }),
    });

    if (!geocodeRes.ok) {
      const body = await geocodeRes.json().catch(() => null);
      setStatus({
        state: "error",
        message:
          body?.error?.message ??
          "住所のジオコーディングに失敗しました。入力内容を確認してください。",
      });
      return;
    }

    const geocodeData = await geocodeRes.json();
    const geo = geocodeData.data;

    const mapsQuery = new URLSearchParams({
      api: "1",
      query: geo.formatted_address ?? values.address,
    }).toString();

    const payload = {
      title: values.title,
      description: values.description,
      address: geo.formatted_address ?? values.address,
      maps_query: mapsQuery,
      maps_place_id: geo.place_id,
      icon_type: values.icon_type,
      lat: geo.lat,
      lng: geo.lng,
      era_hint: values.era_hint || undefined,
      sources: [
        {
          type: values.source_type,
          citation: values.source_citation,
          url: values.source_url ?? undefined,
        },
      ],
    };

    const spotRes = await fetch("/api/spots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!spotRes.ok) {
      const body = await spotRes.json().catch(() => null);
      setStatus({
        state: "error",
        message:
          body?.error?.message ??
          "スポットの保存に失敗しました。権限や入力内容を確認してください。",
      });
      return;
    }

    const result = await spotRes.json();
    setStatus({
      state: "success",
      message: `下書きとして保存しました（ID: ${result.data?.id ?? "unknown"}）。レビュー待ちに進みます。`,
    });
    form.reset({
      title: "",
      description: "",
      address: "",
      icon_type: "GENERIC",
      era_hint: "",
      source_type: "URL",
      source_citation: "",
      source_url: "",
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm"
    >
      <header>
        <h1 className="text-2xl font-semibold">スポット投稿（下書き）</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          伝承・民話の投稿には必ず出典情報が必要です。住所は町名程度までで構いません。
          位置情報は自動的に±100〜300mのぼかしが適用されます。
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Field label="タイトル" error={form.formState.errors.title?.message}>
          <input
            {...form.register("title")}
            className={inputCls}
            placeholder="例：鬼ヶ島の伝説"
          />
        </Field>

        <Field label="アイコン種別" error={form.formState.errors.icon_type?.message}>
          <select {...form.register("icon_type")} className={inputCls}>
            <option value="ONI">鬼の伝承</option>
            <option value="KITSUNE">狐・稲荷</option>
            <option value="DOG">犬・番犬</option>
            <option value="DRAGON">龍・龍神</option>
            <option value="TEMPLE">寺院</option>
            <option value="SHRINE">神社</option>
            <option value="ANIMAL">動物全般</option>
            <option value="GENERIC">その他</option>
          </select>
        </Field>

        <Field
          label="住所 / 地名"
          description="町名などで構いません。Google Maps で座標を取得します。"
          error={form.formState.errors.address?.message}
        >
          <input
            {...form.register("address")}
            className={inputCls}
            placeholder="例：広島県福山市〇〇町"
          />
        </Field>

        <Field
          label="時代・補足メモ（任意）"
          error={form.formState.errors.era_hint?.message}
        >
          <input
            {...form.register("era_hint")}
            className={inputCls}
            placeholder="例：江戸末期〜明治初期"
          />
        </Field>
      </div>

      <Field
        label="本文"
        description="出典に基づき、3000字以内で要約してください。差別的表現や個人情報は含めないでください。"
        error={form.formState.errors.description?.message}
      >
        <textarea
          {...form.register("description")}
          className={cn(inputCls, "min-h-[160px] resize-vertical")}
          placeholder="伝承の概要・現地状況・注意事項などを記載してください。"
        />
      </Field>

      <section className="grid gap-6 md:grid-cols-2">
        <Field
          label="出典タイプ"
          error={form.formState.errors.source_type?.message}
        >
          <select {...form.register("source_type")} className={inputCls}>
            <option value="URL">ウェブサイト</option>
            <option value="BOOK">書籍・文献</option>
            <option value="INTERVIEW">聞き取り・フィールドワーク</option>
          </select>
        </Field>

        <Field
          label="出典 URL"
          description="出典タイプが URL の場合は必須。書籍の場合は空欄で構いません。"
          error={form.formState.errors.source_url?.message}
        >
          <input
            {...form.register("source_url")}
            className={inputCls}
            placeholder="https://example.com/"
          />
        </Field>
      </section>

      <Field
        label="出典情報（引用元の説明）"
        error={form.formState.errors.source_citation?.message}
      >
        <textarea
          {...form.register("source_citation")}
          className={cn(inputCls, "min-h-[80px] resize-vertical")}
          placeholder="出典の書誌情報や URL、取材日などを記載してください。"
        />
      </Field>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-xs text-muted-foreground">
          投稿後はレビュワーが承認するまで公開されません。
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={status.state === "submitting"}
        >
          {status.state === "submitting" ? "送信中…" : "下書きとして保存"}
        </button>
      </div>

      {status.state === "success" && (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {status.message}
        </p>
      )}

      {status.state === "error" && (
        <p className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600">
          {status.message}
        </p>
      )}
    </form>
  );
}

type FieldProps = {
  label: string;
  children: React.ReactNode;
  error?: string;
  description?: string;
};

function Field({ label, children, error, description }: FieldProps) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      {description && (
        <span className="text-xs text-muted-foreground">{description}</span>
      )}
      {children}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent transition focus:border-primary focus:ring-primary/30";
