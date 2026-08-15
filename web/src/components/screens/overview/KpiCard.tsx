import { Card } from "@/components/ui/Card";
import { Sparkline } from "@/components/charts/Sparkline";
import { formatPct } from "@/lib/format";

export function KpiCard({
  label,
  value,
  sub,
  deltaPct,
  goodDirection = "up",
  sparkValues,
  sparkColor,
}: {
  label: string;
  value: string;
  sub: string;
  deltaPct: number;
  /** whether an increase in this metric is good (green) or bad (red) */
  goodDirection?: "up" | "down";
  sparkValues?: number[];
  sparkColor?: string;
}) {
  const isGood = goodDirection === "up" ? deltaPct >= 0 : deltaPct <= 0;

  return (
    <Card className="relative overflow-hidden p-4 pb-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-txm">{label}</span>
        <span
          className="rounded-md px-1.5 py-0.5 text-[11px] font-bold"
          style={{
            color: isGood ? "var(--color-accent2)" : "var(--color-red)",
            background: isGood ? "rgba(55,214,154,.12)" : "rgba(242,88,95,.12)",
          }}
        >
          {formatPct(deltaPct)}
        </span>
      </div>
      <div className="font-mono text-[26px] font-extrabold leading-none tracking-tight">{value}</div>
      <div className="mt-1.5 text-[11px] text-txd">{sub}</div>
      {sparkValues && sparkColor && (
        <Sparkline values={sparkValues} stroke={sparkColor} fill="transparent" />
      )}
    </Card>
  );
}
