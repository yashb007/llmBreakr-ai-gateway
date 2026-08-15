"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { swrFetcher } from "@/lib/client-fetch";
import { formatDateTime } from "@/lib/format";
import type { AuditLogRow, Paginated } from "@/types/api";

const COLS = "grid-cols-[150px_1.1fr_1fr_1.2fr_0.7fr_1fr]";

export function AuditLogsScreen({ initialData }: { initialData: Paginated<AuditLogRow> }) {
  const [page, setPage] = useState(1);
  const query = new URLSearchParams({ page: String(page), limit: "50" }).toString();

  const { data } = useSWR<Paginated<AuditLogRow>>(`/api/proxy/audit-logs?${query}`, swrFetcher, {
    fallbackData: page === 1 ? initialData : undefined,
  });

  return (
    <div>
      <div className="mb-5">
        <div className="text-[20px] font-extrabold tracking-tight">Audit logs</div>
        <div className="mt-0.5 text-[13px] text-txm">
          Who did what, when — read-only record of admin actions across the panel.
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className={`grid ${COLS} gap-3 border-b border-border px-[18px] py-2.5 text-[10.5px] font-bold uppercase tracking-wide text-txd`}>
          <span>Time</span>
          <span>Actor</span>
          <span>Action</span>
          <span>Resource</span>
          <span>Status</span>
          <span>IP</span>
        </div>
        {data && data.data.length > 0 ? (
          data.data.map((row) => (
            <div
              key={row.id}
              className={`grid ${COLS} items-center gap-3 border-b border-white/4 px-[18px] py-2.5 text-[12.5px] last:border-b-0 hover:bg-white/2`}
            >
              <span className="font-mono text-[11.5px] text-txm">{formatDateTime(row.ts)}</span>
              <span className="truncate text-txm">{row.actor_email ?? row.actor_type}</span>
              <span className="truncate font-mono text-xs font-semibold">{row.action}</span>
              <span className="truncate text-txm">
                {row.resource_type ? `${row.resource_type}${row.resource_id ? ` #${row.resource_id}` : ""}` : "—"}
              </span>
              <span>
                <Pill tone={row.status === "success" ? "success" : "error"}>{row.status}</Pill>
              </span>
              <span className="truncate font-mono text-[11.5px] text-txd">{row.ip ?? "—"}</span>
            </div>
          ))
        ) : (
          <p className="px-[18px] py-10 text-center text-sm text-txd">No audit log entries.</p>
        )}
      </Card>

      {data && data.pagination.total_pages > 1 && (
        <div className="mt-3.5 flex items-center justify-between text-xs text-txm">
          <span>
            Page {data.pagination.page} of {data.pagination.total_pages} — {data.pagination.total.toLocaleString()} total
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-[8px] border border-border px-3 py-1.5 font-semibold hover:border-border2 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.pagination.total_pages, p + 1))}
              disabled={page >= data.pagination.total_pages}
              className="rounded-[8px] border border-border px-3 py-1.5 font-semibold hover:border-border2 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
