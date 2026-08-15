import Link from "next/link";
import { cn } from "@/lib/format";

const RANGES: { value: string; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

export function RangeSwitch({ active, basePath = "/overview" }: { active: string; basePath?: string }) {
  return (
    <div className="flex rounded-[9px] border border-border bg-panel p-0.5">
      {RANGES.map((r) => (
        <Link
          key={r.value}
          href={`${basePath}?range=${r.value}`}
          className={cn(
            "rounded-[7px] px-3 py-1 text-xs font-semibold transition-colors",
            active === r.value ? "bg-raise font-bold text-tx" : "text-txm hover:text-tx"
          )}
        >
          {r.label}
        </Link>
      ))}
    </div>
  );
}
