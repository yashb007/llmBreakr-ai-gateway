type Point = [number, number];

// Catmull-Rom-style smoothing through evenly spaced points — mirrors the
// approach used across the design spec's own hand-rolled charts.
function smooth(pts: Point[]): string {
  const first = pts[0];
  if (pts.length < 2 || !first) return "";

  let d = `M ${first[0].toFixed(1)} ${first[1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

// Maps values onto an explicit mn..mx range — exported so callers (e.g. a
// chart's hover handler) can recompute the exact same point a path was
// drawn through, to place a marker/tooltip at it.
export function scalePoints(vals: number[], width: number, height: number, pad: number, mn: number, mx: number): Point[] {
  const n = vals.length;
  const range = mx - mn || 1;
  return vals.map((v, i) => [
    pad + (i * (width - 2 * pad)) / Math.max(n - 1, 1),
    height - pad - ((v - mn) / range) * (height - 2 * pad),
  ]);
}

export function buildPath(vals: number[], width: number, height: number, pad: number) {
  if (vals.length === 0) return { line: "", area: "" };
  const pts = scalePoints(vals, width, height, pad, Math.min(...vals), Math.max(...vals));
  const line = smooth(pts);
  const last = pts[pts.length - 1];
  const first = pts[0];
  const area = last && first ? `${line} L ${last[0].toFixed(1)} ${height} L ${first[0].toFixed(1)} ${height} Z` : "";
  return { line, area };
}

export function donutSegments(values: { value: number; color: string }[], radius: number) {
  const total = values.reduce((sum, v) => sum + v.value, 0) || 1;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return values.map((v) => {
    const fraction = v.value / total;
    const dash = `${(fraction * circumference).toFixed(1)} ${circumference.toFixed(1)}`;
    const segment = { color: v.color, dash, offset: (-offset).toFixed(1), pct: fraction };
    offset += fraction * circumference;
    return segment;
  });
}
