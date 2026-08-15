import { redirect } from "next/navigation";
import { apiFetch, classifyApiError } from "@/lib/api";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { Card } from "@/components/ui/Card";
import { RangeSwitch } from "@/components/screens/overview/RangeSwitch";
import { KpiCard } from "@/components/screens/overview/KpiCard";
import { AreaChart } from "@/components/charts/AreaChart";
import { Donut } from "@/components/charts/Donut";
import { formatCompactNumber, formatDate, formatLatency, formatUsd } from "@/lib/format";
import { providerColor } from "@/lib/providerColors";
import type { UsageResponse } from "@/types/api";

const VALID_RANGES = new Set(["24h", "7d", "30d"]);
const RANGE_LABEL: Record<string, string> = { "24h": "24 hours", "7d": "7 days", "30d": "30 days" };

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rawRange } = await searchParams;
  const range = VALID_RANGES.has(rawRange ?? "") ? rawRange! : "7d";

  let usage: UsageResponse;
  try {
    usage = await apiFetch<UsageResponse>(`/api/admin/usage?range=${range}`);
  } catch (error) {
    if (classifyApiError(error) === "unauthorized") redirect("/login");
    if (classifyApiError(error) === "forbidden") return <AccessDenied section="usage analytics" />;
    throw error;
  }

  const { totals, deltas, series, provider_mix } = usage;
  const requestValues = series.map((s) => s.success + s.error);
  const errorValues = series.map((s) => s.error);
  const isHourly = range === "24h";
  const chartLabels = series.map((s) =>
    isHourly ? s.bucket.slice(11, 16) : formatDate(new Date(s.bucket).toISOString())
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3.5">
        <div className="flex flex-col gap-0.5">
          <div className="text-[22px] font-extrabold tracking-tight">Overview</div>
          <div className="text-[13px] text-txm">Here&apos;s what your gateway did over the last {RANGE_LABEL[range]}.</div>
        </div>
        <div className="flex-1" />
        <RangeSwitch active={range} />
      </div>

      <div className="mb-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Requests"
          value={formatCompactNumber(totals.requests)}
          sub={`vs prior ${RANGE_LABEL[range]}`}
          deltaPct={deltas.requests_pct}
          sparkValues={requestValues.length > 1 ? requestValues : undefined}
          sparkColor="var(--color-accent)"
        />
        <KpiCard
          label="Spend"
          value={formatUsd(totals.cost_usd)}
          sub="estimated USD this period"
          deltaPct={deltas.cost_pct}
        />
        <KpiCard
          label="Avg latency"
          value={formatLatency(totals.avg_latency_ms)}
          sub="across all models"
          deltaPct={deltas.latency_pct}
          goodDirection="down"
        />
        <KpiCard
          label="Error rate"
          value={`${(totals.error_rate * 100).toFixed(1)}%`}
          sub={`${totals.errors.toLocaleString()} of ${totals.requests.toLocaleString()}`}
          deltaPct={deltas.error_rate_pct}
          goodDirection="down"
          sparkValues={errorValues.length > 1 ? errorValues : undefined}
          sparkColor="var(--color-red)"
        />
      </div>

      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-3">
        <Card className="p-[18px] lg:col-span-2">
          <div className="mb-1.5 flex items-start justify-between">
            <div>
              <div className="text-sm font-bold">Request traffic</div>
              <div className="mt-0.5 text-xs text-txm">Successful vs failed requests</div>
            </div>
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

        <Card className="p-[18px]">
          <div className="text-sm font-bold">Provider mix</div>
          <div className="text-xs text-txm">Requests routed by upstream</div>
          {provider_mix.length > 0 ? (
            <>
              <div className="my-3.5 flex items-center justify-center">
                <Donut
                  values={provider_mix.map((p) => ({ value: p.requests, color: providerColor(p.provider) }))}
                  centerLabel={formatCompactNumber(totals.requests)}
                  centerSub="requests"
                />
              </div>
              <div className="mt-1 flex flex-col gap-2.5">
                {provider_mix.map((p) => (
                  <div key={p.provider} className="flex items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 rounded-[3px]"
                      style={{ background: providerColor(p.provider) }}
                    />
                    <span className="flex-1 text-[12.5px] font-semibold capitalize">{p.provider}</span>
                    <span className="font-mono text-xs text-txm">{formatCompactNumber(p.requests)}</span>
                    <span className="w-[42px] text-right font-mono text-xs font-bold">
                      {(p.pct * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="py-14 text-center text-sm text-txd">No traffic yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
