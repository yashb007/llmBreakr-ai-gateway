"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { User } from "@/types/api";

// Deterministic per-day, not random per render — a fixed line all day
// reads as intentional; a new one flickering in on every navigation would
// just look broken. `getDate()` (day of month) rotates the pick daily.
const TIME_BUCKETS: { maxHour: number; label: string; lines: string[] }[] = [
  { maxHour: 5, label: "Working late", lines: ["even the gateway needs sleep sometimes.", "night owl mode: activated.", "burning the midnight oil."] },
  { maxHour: 12, label: "Good morning", lines: ["ready to route some requests?", "the models are warmed up and waiting.", "let's keep those tokens flowing."] },
  { maxHour: 17, label: "Good afternoon", lines: ["keep the requests flowing.", "the gateway's got your back.", "still crushing it out there."] },
  { maxHour: 21, label: "Good evening", lines: ["wrapping up for the day?", "still shipping this late? respect.", "the day's winding down, the gateway isn't."] },
  { maxHour: 24, label: "Working late", lines: ["even the gateway needs sleep sometimes.", "night owl mode: activated.", "burning the midnight oil."] },
];

function greetingFor(date: Date, name: string): string {
  const hour = date.getHours();
  const bucket = TIME_BUCKETS.find((b) => hour < b.maxHour) ?? TIME_BUCKETS[TIME_BUCKETS.length - 1]!;
  const line = bucket.lines[date.getDate() % bucket.lines.length];
  const firstName = name.split(" ")[0];
  return `${bucket.label}, ${firstName} — ${line}`;
}

export function Topbar({ user }: { user: User }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <header className="flex h-[62px] flex-none items-center gap-4 border-b border-border bg-bg/70 px-[26px] backdrop-blur-md">
      <div className="min-w-0 truncate text-[15px] font-bold tracking-tight">{greetingFor(new Date(), user.name)}</div>
      <div className="flex-1" />
      <ThemeToggle />
      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-[10px] border border-border bg-panel py-1.5 pl-1.5 pr-2.5 hover:border-border2"
        >
          <div className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[8px] bg-gradient-to-br from-[#5b8def] to-accent2 text-[12px] font-bold text-[#08131a]">
            {initials || "?"}
          </div>
          <div className="text-left leading-tight">
            <div className="text-[12.5px] font-bold">{user.name}</div>
            <div className="text-[10.5px] text-txd">{user.email}</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-txd)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-[calc(100%+8px)] w-40 overflow-hidden rounded-[10px] border border-border2 bg-panel2 shadow-lg">
            <Link
              href="/profile"
              onClick={() => setMenuOpen(false)}
              className="block w-full px-3.5 py-2.5 text-left text-[13px] font-semibold text-txm hover:bg-white/5 hover:text-tx"
            >
              Profile
            </Link>
            <button
              onClick={logout}
              className="w-full border-t border-border px-3.5 py-2.5 text-left text-[13px] font-semibold text-txm hover:bg-white/5 hover:text-tx"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
