import { cn } from "@/lib/format";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
}

const VARIANTS: Record<string, string> = {
  primary: "bg-accent text-white hover:brightness-110 shadow-[0_4px_14px_var(--color-accent-soft)]",
  secondary: "bg-panel2 border border-border text-txm hover:border-border2 hover:text-tx",
  danger: "bg-panel2 border border-border text-txm hover:border-red hover:text-red",
};

export function Button({ variant = "primary", className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-[13px] font-bold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANTS[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
