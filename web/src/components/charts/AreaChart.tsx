"use client";

import { useRef, useState } from "react";
import { buildPath, scalePoints } from "@/lib/charts";
import { thinLabels } from "@/lib/format";

interface Series {
  values: number[];
  stroke: string;
  fill?: string;
  name?: string;
}

export function AreaChart({
  series,
  labels,
  width = 1000,
  height = 260,
  pad = 20,
  showGrid = true,
}: {
  series: Series[];
  labels?: string[];
  width?: number;
  height?: number;
  pad?: number;
  showGrid?: boolean;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const n = series[0]?.values.length ?? 0;

  const gridLines = showGrid ? [0, 1, 2, 3].map((i) => pad + (i * (height - 2 * pad)) / 3) : [];

  const handleMove = (e: React.MouseEvent) => {
    if (n < 2) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const fraction = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    setHoverIndex(Math.round(fraction * (n - 1)));
  };

  const hoverX = hoverIndex != null && n > 1 ? pad + (hoverIndex * (width - 2 * pad)) / (n - 1) : null;
  const hoverPct = hoverIndex != null && n > 1 ? (hoverIndex / (n - 1)) * 100 : null;

  return (
    <div
      ref={containerRef}
      className="relative mt-2.5"
      onMouseMove={handleMove}
      onMouseLeave={() => setHoverIndex(null)}
    >
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block w-full overflow-visible" style={{ height }}>
        {gridLines.map((y) => (
          <line key={y} x1={0} y1={y} x2={width} y2={y} stroke="var(--chart-grid)" strokeWidth={1} />
        ))}
        {series.map((s, i) => {
          const { line, area } = buildPath(s.values, width, height, pad);
          return (
            <g key={i}>
              {s.fill && <path d={area} fill={s.fill} />}
              <path d={line} fill="none" stroke={s.stroke} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        })}
        {hoverX != null && (
          <line x1={hoverX} y1={pad} x2={hoverX} y2={height - pad} stroke="var(--chart-hairline)" strokeWidth={1} strokeDasharray="3 3" />
        )}
        {hoverIndex != null &&
          series.map((s, i) => {
            const pts = scalePoints(s.values, width, height, pad, Math.min(...s.values), Math.max(...s.values));
            const point = pts[hoverIndex];
            if (!point) return null;
            return <circle key={i} cx={point[0]} cy={point[1]} r={3.5} fill={s.stroke} stroke="var(--color-panel)" strokeWidth={1.5} />;
          })}
      </svg>
      {hoverIndex != null && hoverPct != null && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-[8px] border border-border2 bg-panel2 px-2.5 py-2 text-[11px] shadow-lg"
          style={{ left: `${hoverPct}%` }}
        >
          {labels?.[hoverIndex] && <div className="mb-1 font-mono text-[10px] text-txd">{labels[hoverIndex]}</div>}
          {series.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: s.stroke }} />
              <span className="text-txm">{s.name ?? "Value"}</span>
              <span className="ml-auto font-mono font-bold text-tx">{(s.values[hoverIndex] ?? 0).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
      {labels && (
        <div className="mt-2 flex justify-between">
          {thinLabels(labels).map((l, i) => (
            <span key={i} className="font-mono text-[10.5px] text-txd">
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
