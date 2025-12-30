"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

import { cn } from "@/lib/utils";
import type { FlagListItem } from "./flag-types";

type FlagListProps = {
  initialFlags: FlagListItem[];
};

export function FlagList({ initialFlags }: FlagListProps) {
  const [flags, setFlags] = useState(initialFlags);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function resolveFlag(flagId: string) {
    setLoadingId(flagId);
    setMessage(null);
    try {
      const res = await fetch(`/api/flags/${flagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "更新に失敗しました。");
      }

      setFlags((prev) => prev.filter((flag) => flag.id !== flagId));
      setMessage({
        type: "success",
        text: "通報をクローズしました。",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "更新時にエラーが発生しました。",
      });
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">スポット</th>
              <th className="px-4 py-3">理由 / メモ</th>
              <th className="px-4 py-3">通報者</th>
              <th className="px-4 py-3 text-right">アクション</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {flags.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  現在対応が必要な通報はありません。
                </td>
              </tr>
            ) : (
              flags.map((flag) => (
                <tr key={flag.id} className="transition hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">
                      {flag.spot_title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(flag.created_at), "yyyy年MM月dd日 HH:mm", {
                        locale: ja,
                      })}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {translateReason(flag.reason)}
                    </span>
                    {flag.note ? (
                      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                        {flag.note}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {flag.created_by === "anonymous"
                      ? "匿名"
                      : flag.created_by}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => resolveFlag(flag.id)}
                      disabled={loadingId === flag.id}
                      className={cn(
                        "inline-flex items-center justify-center rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-60"
                      )}
                    >
                      対応済みにする
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {message && (
        <p
          className={cn(
            "rounded-md px-4 py-3 text-sm",
            message.type === "success"
              ? "border border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border border-red-300 bg-red-50 text-red-600"
          )}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

function translateReason(reason: FlagListItem["reason"]) {
  switch (reason) {
    case "INAPPROPRIATE":
      return "不適切表現";
    case "WRONG_INFO":
      return "誤情報";
    case "DISCRIMINATION":
      return "差別・偏見";
    case "PRIVACY":
      return "プライバシー懸念";
    default:
      return "その他";
  }
}
