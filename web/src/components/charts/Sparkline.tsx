import { buildPath } from "@/lib/charts";

export function Sparkline({
  values,
  stroke,
  fill,
  width = 120,
  height = 34,
}: {
  values: number[];
  stroke: string;
  fill: string;
  width?: number;
  height?: number;
}) {
  const { line, area } = buildPath(values, width, height, 4);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="mt-2 block h-[30px] w-full">
      <path d={area} fill={fill} />
      <path d={line} fill="none" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
