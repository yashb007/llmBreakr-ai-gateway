import { cn } from "@/lib/format";
import type { HTMLAttributes } from "react";

type PillTone = "success" | "error" | "warning" | "neutral" | "accent";

const TONES: Record<PillTone, string> = {
  success: "text-accent2 bg-[rgba(55,214,154,.12)]",
  error: "text-red bg-[rgba(242,88,95,.12)]",
  warning: "text-amber bg-[rgba(246,182,75,.12)]",
  neutral: "text-txd bg-white/6",
  accent: "text-accent bg-accent-soft",
};

interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: PillTone;
}

export function Pill({ tone = "neutral", className, ...props }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold",
        TONES[tone],
        className
      )}
      {...props}
    />
  );
}
