export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function formatUsd(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatPct(value: number): string {
  const pct = (value * 100).toFixed(1);
  return `${value >= 0 ? "▲" : "▼"} ${Math.abs(Number(pct))}%`;
}

export function formatLatency(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Charts now plot one point per bucket even when there's no traffic, so a
// 30-day window means ~30 x-axis labels — too many to render legibly side
// by side. Keeps every Nth label (plus the last) and blanks the rest, while
// preserving the original array length so label positions stay aligned
// with their bars/points.
export function thinLabels(labels: string[], maxLabels = 10): string[] {
  if (labels.length <= maxLabels) return labels;
  const step = Math.ceil(labels.length / maxLabels);
  return labels.map((l, i) => (i % step === 0 || i === labels.length - 1 ? l : ""));
}
