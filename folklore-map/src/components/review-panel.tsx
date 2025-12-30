"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

import type { SpotDetail } from "./spot-types";
import type { SpotHistory } from "@/lib/types/history";
import { cn } from "@/lib/utils";
import { HistoryDiff } from "./history-diff";

type ReviewPanelProps = {
  initialSpots: SpotDetail[];
};

type ActionStatus =
  | { kind: "idle" }
  | { kind: "loading"; spotId: string; action: string }
  | { kind: "error"; message: string }
  | { kind: "success"; message: string };

export function ReviewPanel({ initialSpots }: ReviewPanelProps) {
  const [spots, setSpots] = useState(initialSpots);
  const [status, setStatus] = useState<ActionStatus>({ kind: "idle" });
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSpots[0]?.id ?? null
  );
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    source: false,
    discrimination: false,
    privacy: false,
    accuracy: false,
  });
  const [history, setHistory] = useState<SpotHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const grouped = useMemo(() => {
    return {
      REVIEW: spots.filter((spot) => spot.status === "REVIEW"),
      DRAFT: spots.filter((spot) => spot.status === "DRAFT"),
    };
  }, [spots]);

  const selectedSpot = useMemo(
    () => spots.find((spot) => spot.id === selectedId) ?? null,
    [spots, selectedId]
  );

  useEffect(() => {
    if (!selectedSpot) {
      if (spots.length === 0) {
        setSelectedId(null);
      } else {
        setSelectedId(spots[0].id);
      }
    }
  }, [selectedSpot, spots]);

  useEffect(() => {
    setChecklist({
      source: false,
      discrimination: false,
      privacy: false,
      accuracy: false,
    });
    setHistory(null);
    setShowHistory(false);
  }, [selectedId]);

  async function loadHistory(spotId: string) {
    if (loadingHistory) return;

    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/spots/${spotId}/history`);
      if (!res.ok) {
        throw new Error("履歴の取得に失敗しました。");
      }
      const data = await res.json();
      setHistory(data.data);
      setShowHistory(true);
    } catch (error) {
      console.error(error);
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "履歴の取得に失敗しました。",
      });
    } finally {
      setLoadingHistory(false);
    }
  }

  async function updateSpot(
    spotId: string,
    payload: { status: "REVIEW" | "DRAFT" | "PUBLISHED" }
  ) {
    setStatus({ kind: "loading", spotId, action: payload.status });
    try {
      const res = await fetch(`/api/spots/${spotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "更新に失敗しました。");
      }
      const data = (await res.json()) as {
        data: { id: string; status: "DRAFT" | "REVIEW" | "PUBLISHED" };
      };
      startTransition(() => {
        setSpots((prev) =>
          prev
            .map((spot) =>
              spot.id === spotId
                ? { ...spot, status: data.data.status }
                : spot
            )
            .filter((spot) => spot.status !== "PUBLISHED")
        );
      });
      setStatus({
        kind: "success",
        message:
          payload.status === "PUBLISHED"
            ? "公開しました。地図に反映されます。"
            : payload.status === "REVIEW"
              ? "レビュー待ちに移動しました。"
              : "下書きに戻しました。",
      });
    } catch (error) {
      console.error(error);
      setStatus({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "更新時にエラーが発生しました。",
      });
    }
  }

  const isLoading = pending || status.kind === "loading";
  const checklistComplete = Object.values(checklist).every(Boolean);

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <div className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">レビュー待ち</h2>
          {grouped.REVIEW.length === 0 ? (
            <EmptyMessage message="レビュー待ちのスポットはありません。" />
          ) : (
            <SpotTable
              spots={grouped.REVIEW}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">下書き</h2>
          {grouped.DRAFT.length === 0 ? (
            <EmptyMessage message="下書きはありません。" />
          ) : (
            <SpotTable
              spots={grouped.DRAFT}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </section>

        {status.kind === "error" && (
          <p className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600">
            {status.message}
          </p>
        )}
        {status.kind === "success" && (
          <p className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {status.message}
          </p>
        )}
      </div>

      <aside className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
        {selectedSpot ? (
          <>
            <header className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">
                {selectedSpot.title}
              </h3>
              <p className="text-xs uppercase text-muted-foreground">
                ステータス:{" "}
                {selectedSpot.status === "REVIEW"
                  ? "レビュー待ち"
                  : selectedSpot.status === "DRAFT"
                    ? "下書き"
                    : "公開"}
              </p>
              <p className="text-xs text-muted-foreground">
                最終更新:{" "}
                {format(new Date(selectedSpot.updated_at), "yyyy年MM月dd日 HH:mm", {
                  locale: ja,
                })}
              </p>
            </header>

            <section className="space-y-2 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">概要</p>
              <p className="whitespace-pre-wrap">{selectedSpot.description}</p>
            </section>

            <section className="space-y-2 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">出典</p>
              {selectedSpot.sources.length === 0 ? (
                <p className="text-xs text-red-600">出典が登録されていません。</p>
              ) : (
                <ul className="list-disc space-y-1 pl-4">
                  {selectedSpot.sources.map((source) => (
                    <li key={source.id}>
                      <span className="text-xs text-muted-foreground">
                        [{translateSourceType(source.type)}]
                      </span>{" "}
                      {source.citation}
                      {source.url ? (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-2 text-xs text-primary underline"
                        >
                          リンク
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-foreground">変更履歴</p>
                <button
                  type="button"
                  onClick={() => {
                    if (showHistory) {
                      setShowHistory(false);
                    } else {
                      loadHistory(selectedSpot.id);
                    }
                  }}
                  disabled={loadingHistory}
                  className="text-xs text-primary underline hover:text-primary/80 disabled:opacity-50"
                >
                  {loadingHistory ? "読み込み中..." : showHistory ? "閉じる" : "表示する"}
                </button>
              </div>
              {showHistory && history && (
                <div className="max-h-96 overflow-y-auto rounded border border-border bg-muted/30 p-3">
                  <HistoryDiff history={history.history} />
                </div>
              )}
            </section>

            <section className="space-y-2 text-sm">
              <p className="font-semibold text-foreground">公開前チェックリスト</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <ChecklistItem
                  label="出典の信頼性を確認した"
                  checked={checklist.source}
                  onChange={(checked) =>
                    setChecklist((prev) => ({ ...prev, source: checked }))
                  }
                />
                <ChecklistItem
                  label="差別・偏見の助長がないことを確認した"
                  checked={checklist.discrimination}
                  onChange={(checked) =>
                    setChecklist((prev) => ({ ...prev, discrimination: checked }))
                  }
                />
                <ChecklistItem
                  label="個人情報・住所特定の恐れがないことを確認した"
                  checked={checklist.privacy}
                  onChange={(checked) =>
                    setChecklist((prev) => ({ ...prev, privacy: checked }))
                  }
                />
                <ChecklistItem
                  label="記述内容が出典と整合している"
                  checked={checklist.accuracy}
                  onChange={(checked) =>
                    setChecklist((prev) => ({ ...prev, accuracy: checked }))
                  }
                />
              </ul>
              <p className="text-xs text-muted-foreground">
                ※チェック結果はローカルでのみ保持されます。公開操作前の参考にしてください。
              </p>
            </section>

            <section className="space-y-2 text-sm">
              {selectedSpot.status === "REVIEW" ? (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={isLoading || !checklistComplete}
                    onClick={() => updateSpot(selectedSpot.id, { status: "PUBLISHED" })}
                    className={cn(
                      "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    )}
                  >
                    公開する
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => updateSpot(selectedSpot.id, { status: "DRAFT" })}
                    className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    下書きに戻す
                  </button>
                </div>
              ) : selectedSpot.status === "DRAFT" ? (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => updateSpot(selectedSpot.id, { status: "REVIEW" })}
                  className={cn(
                    "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  )}
                >
                  レビューに回す
                </button>
              ) : null}
            </section>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            レビュー対象のスポットを選択してください。
          </p>
        )}
      </aside>

    </div>
  );
}

type SpotTableProps = {
  spots: SpotDetail[];
  selectedId: string | null;
  onSelect: (spotId: string) => void;
};

function SpotTable({
  spots,
  selectedId,
  onSelect,
}: SpotTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3">タイトル</th>
            <th className="px-4 py-3">更新日時</th>
            <th className="px-4 py-3">出典</th>
            <th className="px-4 py-3 text-right">アクション</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {spots.map((spot) => (
            <tr
              key={spot.id}
              className={cn(
                "transition hover:bg-muted/40",
                selectedId === spot.id && "bg-primary/5"
              )}
            >
              <td className="px-4 py-3">
                <p className="font-semibold text-foreground">{spot.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {spot.description}
                </p>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {format(new Date(spot.updated_at), "yyyy年MM月dd日 HH:mm", {
                  locale: ja,
                })}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {spot.sources.length > 0
                  ? spot.sources[0].citation
                  : "―"}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => onSelect(spot.id)}
                  className="rounded-md border border-border px-3 py-1 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted/60"
                >
                  詳細を見る
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

type ChecklistItemProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function ChecklistItem({ label, checked, onChange }: ChecklistItemProps) {
  return (
    <label className="flex items-start gap-2">
      <input
        type="checkbox"
        className="mt-1 h-3.5 w-3.5 rounded border border-border text-primary focus:ring-primary/30"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="leading-tight">{label}</span>
    </label>
  );
}

function translateSourceType(type: SpotDetail["sources"][number]["type"]) {
  switch (type) {
    case "URL":
      return "ウェブ";
    case "BOOK":
      return "書籍";
    case "INTERVIEW":
      return "インタビュー";
    default:
      return type;
  }
}
