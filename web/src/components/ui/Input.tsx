import { cn } from "@/lib/format";
import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-[11.5px] font-bold text-txm tracking-wide", className)}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-[9px] border border-border bg-bg px-3 py-2.5 text-[13px] text-tx outline-none placeholder:text-txd focus:border-accent",
        className
      )}
      {...props}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
