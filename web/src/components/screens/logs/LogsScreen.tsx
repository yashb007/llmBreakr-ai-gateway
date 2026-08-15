"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Card } from "@/components/ui/Card";
import { swrFetcher } from "@/lib/client-fetch";
import { providerColor } from "@/lib/providerColors";
import { cn, formatDateTime, formatLatency, formatUsd } from "@/lib/format";
import type { Paginated, ProjectOption, ProviderModel, RequestLogRow, VirtualKey } from "@/types/api";

type Filter = "all" | "success" | "errors" | "rate_limited";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "success", label: "Success" },
  { value: "errors", label: "Errors" },
  { value: "rate_limited", label: "Rate-limited" },
];

const COLS = "grid-cols-[150px_70px_1.2fr_1fr_0.7fr_1.1fr_0.7fr_0.7fr]";

interface AdvancedFilters {
  projectId: string;
  virtualKeyId: string;
  model: string;
  provider: string;
  from: string;
  to: string;
}

const EMPTY_ADVANCED: AdvancedFilters = { projectId: "", virtualKeyId: "", model: "", provider: "", from: "", to: "" };

function queryFor(filter: Filter, page: number, advanced: AdvancedFilters): string {
  const params = new URLSearchParams({ page: String(page), limit: "50" });
  if (filter === "success") params.set("status", "2xx");
  if (filter === "errors") params.set("status", "4xx,5xx");
  if (filter === "rate_limited")
    params.set(
      "blocked_by",
      "rate_limit,budget,project_rate_limit,project_budget,token_limit,monthly_token_limit,project_token_limit,project_monthly_token_limit"
    );
  if (advanced.projectId) params.set("project_id", advanced.projectId);
  if (advanced.virtualKeyId) params.set("virtual_key_id", advanced.virtualKeyId);
  if (advanced.model) params.set("model", advanced.model);
  if (advanced.provider) params.set("provider", advanced.provider);
  if (advanced.from) params.set("from", new Date(advanced.from).toISOString());
  if (advanced.to) params.set("to", new Date(`${advanced.to}T23:59:59.999`).toISOString());
  return params.toString();
}

function statusTone(row: RequestLogRow): "success" | "error" | "warning" {
  if (row.status_bucket === "2xx") return "success";
  if (row.status === 429) return "warning";
  return "error";
}

const selectClass =
  "rounded-[8px] border border-border bg-panel2 px-2.5 py-1.5 text-[12.5px] font-semibold text-tx outline-none focus:border-accent";

export function LogsScreen({
  initialData,
  projects,
  virtualKeys,
  models,
}: {
  initialData: Paginated<RequestLogRow>;
  projects: ProjectOption[];
  virtualKeys: VirtualKey[];
  models: ProviderModel[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [advanced, setAdvanced] = useState<AdvancedFilters>(EMPTY_ADVANCED);
  const query = queryFor(filter, page, advanced);

  const { data } = useSWR<Paginated<RequestLogRow>>(`/api/proxy/logs?${query}`, swrFetcher, {
    fallbackData: filter === "all" && page === 1 && advanced === EMPTY_ADVANCED ? initialData : undefined,
  });

  const providers = useMemo(() => Array.from(new Set(models.map((m) => m.provider))).sort(), [models]);
  const modelIds = useMemo(() => Array.from(new Set(models.map((m) => m.model_id))).sort(), [models]);
  const keysForProject = useMemo(
    () => (advanced.projectId ? virtualKeys.filter((k) => k.project_id === Number(advanced.projectId)) : virtualKeys),
    [virtualKeys, advanced.projectId]
  );

  const changeFilter = (f: Filter) => {
    setFilter(f);
    setPage(1);
  };

  const setAdvancedField = <K extends keyof AdvancedFilters>(key: K, value: string) => {
    setAdvanced((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "projectId") next.virtualKeyId = ""; // stale key from the old project no longer applies
      return next;
    });
    setPage(1);
  };

  const hasAdvancedFilters = Object.values(advanced).some(Boolean);
  const clearAdvanced = () => {
    setAdvanced(EMPTY_ADVANCED);
    setPage(1);
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div>
          <div className="text-[20px] font-extrabold tracking-tight">Request logs</div>
          <div className="mt-0.5 text-[13px] text-txm">
            Every data-plane call, success or failure, with tokens, latency and cost.
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex rounded-[9px] border border-border bg-panel p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => changeFilter(f.value)}
              className={cn(
                "rounded-[7px] px-3 py-1 text-xs font-semibold transition-colors",
                filter === f.value ? "bg-raise font-bold text-tx" : "text-txm hover:text-tx"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <select value={advanced.projectId} onChange={(e) => setAdvancedField("projectId", e.target.value)} className={selectClass}>
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select value={advanced.virtualKeyId} onChange={(e) => setAdvancedField("virtualKeyId", e.target.value)} className={selectClass}>
          <option value="">All virtual keys</option>
          {keysForProject.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
        <select value={advanced.provider} onChange={(e) => setAdvancedField("provider", e.target.value)} className={selectClass}>
          <option value="">All providers</option>
          {providers.map((p) => (
            <option key={p} value={p} className="capitalize">
              {p}
            </option>
          ))}
        </select>
        <select value={advanced.model} onChange={(e) => setAdvancedField("model", e.target.value)} className={selectClass}>
          <option value="">All models</option>
          {modelIds.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={advanced.from}
            onChange={(e) => setAdvancedField("from", e.target.value)}
            className={cn(selectClass, "font-mono")}
          />
          <span className="text-xs text-txd">to</span>
          <input
            type="date"
            value={advanced.to}
            onChange={(e) => setAdvancedField("to", e.target.value)}
            className={cn(selectClass, "font-mono")}
          />
        </div>
        {hasAdvancedFilters && (
          <button onClick={clearAdvanced} className="text-[12.5px] font-semibold text-txm hover:text-tx">
            Clear filters
          </button>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className={`grid ${COLS} gap-3 border-b border-border px-[18px] py-2.5 text-[10.5px] font-bold uppercase tracking-wide text-txd`}>
          <span>Time</span>
          <span>Status</span>
          <span>Model</span>
          <span>Project</span>
          <span>Provider</span>
          <span className="text-right">Tokens (in/out/cached)</span>
          <span className="text-right">Latency</span>
          <span className="text-right">Cost</span>
        </div>
        {data && data.data.length > 0 ? (
          data.data.map((row) => {
            const tone = statusTone(row);
            const tokens =
              row.prompt_tokens != null || row.completion_tokens != null
                ? `${(row.prompt_tokens ?? 0).toLocaleString()} / ${(row.completion_tokens ?? 0).toLocaleString()} / ${(row.cache_read_tokens ?? 0).toLocaleString()}`
                : "—";
            return (
              <div
                key={row.id}
                className={`grid ${COLS} items-center gap-3 border-b border-white/4 px-[18px] py-2.5 text-[12.5px] last:border-b-0 hover:bg-white/2`}
              >
                <span className="font-mono text-[11.5px] text-txm">{formatDateTime(row.ts)}</span>
                <span
                  className="rounded-md px-2 py-0.5 text-center font-mono text-[11px] font-bold"
                  style={{
                    color: tone === "success" ? "var(--color-accent2)" : tone === "warning" ? "var(--color-amber)" : "var(--color-red)",
                    background:
                      tone === "success"
                        ? "rgba(55,214,154,.12)"
                        : tone === "warning"
                          ? "rgba(246,182,75,.12)"
                          : "rgba(242,88,95,.12)",
                  }}
                >
                  {row.status ?? row.blocked_by ?? "—"}
                </span>
                <span className="truncate font-mono text-xs font-semibold">{row.model ?? row.blocked_by ?? "—"}</span>
                <span className="truncate text-txm">{row.project_name ?? "—"}</span>
                <span className="flex items-center gap-1.5">
                  {row.provider && (
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: providerColor(row.provider) }} />
                  )}
                  {row.provider ?? "—"}
                </span>
                <span className="text-right font-mono text-txm">{tokens}</span>
                <span className="text-right font-mono text-txm">{row.latency_ms != null ? formatLatency(row.latency_ms) : "—"}</span>
                <span className="text-right font-mono font-semibold">{formatUsd(row.cost_usd)}</span>
              </div>
            );
          })
        ) : (
          <p className="px-[18px] py-10 text-center text-sm text-txd">No requests match this filter.</p>
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
