import { cn } from "@/lib/format";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-panel border border-border bg-panel", className)}
      {...props}
    />
  );
}
