import { donutSegments } from "@/lib/charts";

export function Donut({
  values,
  centerLabel,
  centerSub,
  size = 168,
  radius = 62,
  strokeWidth = 18,
}: {
  values: { value: number; color: string }[];
  centerLabel: string;
  centerSub: string;
  size?: number;
  radius?: number;
  strokeWidth?: number;
}) {
  const segments = donutSegments(values, radius);
  const c = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={c} cy={c} r={radius} fill="none" stroke="var(--chart-grid)" strokeWidth={strokeWidth} />
      {segments.map((s, i) => (
        <circle
          key={i}
          cx={c}
          cy={c}
          r={radius}
          fill="none"
          stroke={s.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={s.dash}
          strokeDashoffset={s.offset}
          transform={`rotate(-90 ${c} ${c})`}
        />
      ))}
      <text x={c} y={c - 6} textAnchor="middle" fill="var(--color-tx)" fontSize={26} fontWeight={800} fontFamily="var(--font-jetbrains-mono)">
        {centerLabel}
      </text>
      <text x={c} y={c + 14} textAnchor="middle" fill="var(--color-txd)" fontSize={11} fontWeight={600}>
        {centerSub}
      </text>
    </svg>
  );
}
