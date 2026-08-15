"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card } from "@/components/ui/Card";
import { StackedBarChart } from "@/components/charts/StackedBarChart";
import { swrFetcher } from "@/lib/client-fetch";
import { formatDate } from "@/lib/format";
import type { UsageResponse, VirtualKey } from "@/types/api";

export function ProjectTokensCard({
  projectId,
  range,
  virtualKeys,
  initialUsage,
}: {
  projectId: number;
  range: string;
  virtualKeys: VirtualKey[];
  initialUsage: UsageResponse;
}) {
  const [virtualKeyId, setVirtualKeyId] = useState("");

  // Always daily buckets, regardless of the selected window — the "24h"
  // window's initial server fetch (initialUsage) was hourly-bucketed, so it
  // can't be reused as fallbackData there without a flash of the wrong
  // granularity; every other window already buckets daily by default, so
  // that pre-fetch matches and can be reused.
  const query = new URLSearchParams({ range, project_id: String(projectId), bucket: "day" });
  if (virtualKeyId) query.set("virtual_key_id", virtualKeyId);

  const { data } = useSWR<UsageResponse>(`/api/proxy/usage?${query.toString()}`, swrFetcher, {
    fallbackData: virtualKeyId === "" && range !== "24h" ? initialUsage : undefined,
  });

  const series = data?.series ?? [];
  const chartLabels = series.map((s) => formatDate(new Date(s.bucket).toISOString()));

  return (
    <Card className="mb-[18px] p-[18px]">
      <div className="mb-1.5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold">Token usage</div>
          <div className="mt-0.5 text-xs text-txm">Input, output and cached tokens per day</div>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={virtualKeyId}
            onChange={(e) => setVirtualKeyId(e.target.value)}
            className="rounded-[8px] border border-border bg-panel2 px-2.5 py-1.5 text-[12.5px] font-semibold text-tx outline-none focus:border-accent"
          >
            <option value="">All virtual keys</option>
            {virtualKeys.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
          <div className="flex gap-4 text-[11.5px] text-txm">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: "var(--color-accent)" }} />
              Input
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: "var(--color-accent2)" }} />
              Output
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: "var(--color-amber)" }} />
              Cached
            </span>
          </div>
        </div>
      </div>
      {series.length > 0 ? (
        <StackedBarChart
          bands={[
            { values: series.map((s) => s.input_tokens), color: "var(--color-accent)", name: "Input" },
            { values: series.map((s) => s.output_tokens), color: "var(--color-accent2)", name: "Output" },
            { values: series.map((s) => s.cached_tokens), color: "var(--color-amber)", name: "Cached" },
          ]}
          labels={chartLabels}
        />
      ) : (
        <p className="py-16 text-center text-sm text-txd">Not enough data yet for this range.</p>
      )}
    </Card>
  );
}
