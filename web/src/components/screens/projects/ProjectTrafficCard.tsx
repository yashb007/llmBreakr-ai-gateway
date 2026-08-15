"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card } from "@/components/ui/Card";
import { AreaChart } from "@/components/charts/AreaChart";
import { swrFetcher } from "@/lib/client-fetch";
import { formatDate } from "@/lib/format";
import type { UsageResponse, VirtualKey } from "@/types/api";

export function ProjectTrafficCard({
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

  const query = new URLSearchParams({ range, project_id: String(projectId) });
  if (virtualKeyId) query.set("virtual_key_id", virtualKeyId);

  const { data } = useSWR<UsageResponse>(`/api/proxy/usage?${query.toString()}`, swrFetcher, {
    fallbackData: virtualKeyId === "" ? initialUsage : undefined,
  });

  const series = data?.series ?? [];
  const isHourly = range === "24h";
  const chartLabels = series.map((s) => (isHourly ? s.bucket.slice(11, 16) : formatDate(new Date(s.bucket).toISOString())));

  return (
    <Card className="mb-[18px] p-[18px]">
      <div className="mb-1.5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold">Request traffic</div>
          <div className="mt-0.5 text-xs text-txm">Successful vs failed requests</div>
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
              Success
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: "var(--color-red)" }} />
              Errors
            </span>
          </div>
        </div>
      </div>
      {series.length > 1 ? (
        <AreaChart
          series={[
            { values: series.map((s) => s.success), stroke: "var(--color-accent)", fill: "rgba(123,116,255,.2)", name: "Success" },
            { values: series.map((s) => s.error), stroke: "var(--color-red)", name: "Errors" },
          ]}
          labels={chartLabels}
        />
      ) : (
        <p className="py-16 text-center text-sm text-txd">Not enough data yet for this range.</p>
      )}
    </Card>
  );
}
