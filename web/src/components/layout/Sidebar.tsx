"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";
import { Logo } from "@/components/ui/Logo";
import { NAV_GROUPS } from "./nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-[250px] flex-none flex-col border-r border-border bg-panel">
      <div className="flex flex-col items-center gap-1.5 px-5 pb-[18px] pt-6">
        <Logo width={164} className="flex-none" />
        <div className="text-[10.5px] font-semibold uppercase tracking-wide text-txd">Smart Gateway</div>
      </div>

      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="px-2.5 pb-1.5 pt-3.5 text-[10px] font-bold uppercase tracking-wide text-txd">
              {group.label}
            </div>
            {group.items.map((item) => {
              const active = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13px] font-semibold transition-colors hover:bg-white/5",
                    active ? "bg-accent-soft font-bold text-accent" : "text-txm"
                  )}
                >
                  <span className="flex h-5 w-5 flex-none items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                      <path d={item.icon} />
                    </svg>
                  </span>
                  <span className="flex-1 text-left">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}
