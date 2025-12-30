"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import type { HistoryEntry } from "@/lib/types/history";
import { cn } from "@/lib/utils";

type HistoryDiffProps = {
  history: HistoryEntry[];
};

export function HistoryDiff({ history }: HistoryDiffProps) {
  if (history.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
        変更履歴はまだありません。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((entry) => (
        <HistoryEntryCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}

type HistoryEntryCardProps = {
  entry: HistoryEntry;
};

function HistoryEntryCard({ entry }: HistoryEntryCardProps) {
  const changes = useMemo(() => {
    const changeList: Array<{
      field: string;
      fieldLabel: string;
      previous: unknown;
      current: unknown;
    }> = [];

    for (const [field, currentValue] of Object.entries(entry.changes)) {
      const previousValue = entry.previous[field];
      if (previousValue !== currentValue) {
        changeList.push({
          field,
          fieldLabel: getFieldLabel(field),
          previous: previousValue,
          current: currentValue,
        });
      }
    }

    return changeList;
  }, [entry.changes, entry.previous]);

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
        <p className="text-xs text-muted-foreground">
          {format(new Date(entry.timestamp), "yyyy年MM月dd日 HH:mm:ss", {
            locale: ja,
          })}
        </p>
        <p className="text-xs text-muted-foreground">
          変更者: {entry.user_id.slice(0, 8)}...
        </p>
      </div>

      <div className="space-y-3">
        {changes.map((change) => (
          <FieldDiff key={change.field} change={change} />
        ))}
      </div>
    </div>
  );
}

type FieldDiffProps = {
  change: {
    field: string;
    fieldLabel: string;
    previous: unknown;
    current: unknown;
  };
};

function FieldDiff({ change }: FieldDiffProps) {
  const { fieldLabel, previous, current, field } = change;

  // 配列の差分表示（sources用）
  if (Array.isArray(previous) || Array.isArray(current)) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">{fieldLabel}</p>
        <div className="grid gap-2 lg:grid-cols-2">
          <div className="rounded border border-red-200 bg-red-50 p-2">
            <p className="mb-1 text-xs font-medium text-red-900">変更前</p>
            <pre className="text-xs text-red-700 whitespace-pre-wrap break-words">
              {JSON.stringify(previous, null, 2)}
            </pre>
          </div>
          <div className="rounded border border-emerald-200 bg-emerald-50 p-2">
            <p className="mb-1 text-xs font-medium text-emerald-900">変更後</p>
            <pre className="text-xs text-emerald-700 whitespace-pre-wrap break-words">
              {JSON.stringify(current, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  // テキストの差分表示
  const prevStr = String(previous ?? "");
  const currStr = String(current ?? "");

  // 長いテキストの場合は単語単位で分割して比較
  if (field === "description" && (prevStr.length > 100 || currStr.length > 100)) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">{fieldLabel}</p>
        <div className="space-y-2">
          <div className="rounded border border-red-200 bg-red-50 p-3">
            <p className="mb-1 text-xs font-medium text-red-900">変更前</p>
            <p className="text-sm text-red-700 whitespace-pre-wrap">{prevStr}</p>
          </div>
          <div className="rounded border border-emerald-200 bg-emerald-50 p-3">
            <p className="mb-1 text-xs font-medium text-emerald-900">変更後</p>
            <p className="text-sm text-emerald-700 whitespace-pre-wrap">{currStr}</p>
          </div>
        </div>
      </div>
    );
  }

  // インライン差分表示（短いテキスト）
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-foreground">{fieldLabel}</p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className={cn(
          "rounded px-2 py-1 border border-red-200 bg-red-50 text-red-700",
          "line-through decoration-red-400"
        )}>
          {prevStr || "(空)"}
        </span>
        <span className="text-muted-foreground">→</span>
        <span className="rounded px-2 py-1 border border-emerald-200 bg-emerald-50 text-emerald-700">
          {currStr || "(空)"}
        </span>
      </div>
    </div>
  );
}

function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    title: "タイトル",
    description: "概要",
    address: "住所",
    icon_type: "アイコンタイプ",
    era_hint: "時代情報",
    status: "ステータス",
    lat: "緯度",
    lng: "経度",
    maps_query: "地図クエリ",
    maps_place_id: "Google Place ID",
  };

  return labels[field] || field;
}
