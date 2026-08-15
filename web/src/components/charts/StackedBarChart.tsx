"use client";

import { useState } from "react";
import { thinLabels } from "@/lib/format";

interface Band {
  values: number[];
  color: string;
  name?: string;
}

export function StackedBarChart({
  bands,
  labels,
  width = 1000,
  height = 260,
  pad = 20,
  showGrid = true,
  gap = 0.3,
}: {
  bands: Band[];
  labels?: string[];
  width?: number;
  height?: number;
  pad?: number;
  showGrid?: boolean;
  gap?: number;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const n = bands[0]?.values.length ?? 0;
  const totals = Array.from({ length: n }, (_, i) => bands.reduce((sum, b) => sum + (b.values[i] ?? 0), 0));
  const max = Math.max(...totals, 0) || 1;

  const innerWidth = width - 2 * pad;
  const innerHeight = height - 2 * pad;
  const slot = n ? innerWidth / n : 0;
  const barWidth = slot * (1 - gap);

  const gridLines = showGrid ? [0, 1, 2, 3].map((i) => pad + (i * innerHeight) / 3) : [];
  const hoverPct = hoverIndex != null && n > 0 ? ((hoverIndex + 0.5) / n) * 100 : null;

  return (
    <div className="relative mt-2.5">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block w-full overflow-visible" style={{ height }}>
        {gridLines.map((y) => (
          <line key={y} x1={0} y1={y} x2={width} y2={y} stroke="var(--chart-grid)" strokeWidth={1} />
        ))}
        {Array.from({ length: n }).map((_, i) => {
          const x = pad + i * slot + (slot - barWidth) / 2;
          let yCursor = height - pad;
          return (
            <g key={i}>
              <rect
                x={pad + i * slot}
                y={pad}
                width={slot}
                height={innerHeight}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex((cur) => (cur === i ? null : cur))}
              />
              {bands.map((b, bi) => {
                const v = b.values[i] ?? 0;
                const h = (v / max) * innerHeight;
                if (h <= 0) return null;
                const y = yCursor - h;
                yCursor = y;
                return (
                  <rect
                    key={bi}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={h}
                    fill={b.color}
                    opacity={hoverIndex == null || hoverIndex === i ? 1 : 0.35}
                    className="pointer-events-none"
                  />
                );
              })}
            </g>
          );
        })}
      </svg>
      {hoverIndex != null && hoverPct != null && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-[8px] border border-border2 bg-panel2 px-2.5 py-2 text-[11px] shadow-lg"
          style={{ left: `${hoverPct}%` }}
        >
          {labels?.[hoverIndex] && <div className="mb-1 font-mono text-[10px] text-txd">{labels[hoverIndex]}</div>}
          {bands.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: b.color }} />
              <span className="text-txm">{b.name ?? "Value"}</span>
              <span className="ml-auto font-mono font-bold text-tx">{(b.values[hoverIndex] ?? 0).toLocaleString()}</span>
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
