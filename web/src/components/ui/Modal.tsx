"use client";

import type { MouseEvent, ReactNode } from "react";

export function Modal({
  open,
  onClose,
  children,
  width = 480,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  if (!open) return null;

  const stop = (e: MouseEvent) => e.stopPropagation();

  return (
    <div
      onClick={onClose}
      className="animate-floatup fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm"
    >
      <div
        onClick={stop}
        style={{ width, maxWidth: "92vw", maxHeight: "90vh" }}
        className="overflow-y-auto overflow-x-hidden overscroll-contain rounded-2xl border border-border2 bg-panel shadow-[0_24px_70px_rgba(0,0,0,.6)]"
      >
        {children}
      </div>
    </div>
  );
}
