export function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className="mb-1 h-1.5 overflow-hidden rounded bg-white/6">
      <span className="block h-full rounded" style={{ width: `${clamped}%`, background: color }} />
    </div>
  );
}
