"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientFetch } from "@/lib/client-fetch";
import { Pill } from "@/components/ui/Pill";

export function UserStatusToggle({ userId, status }: { userId: number; status: "active" | "disabled" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const toggle = async () => {
    setPending(true);
    try {
      await clientFetch(`/api/proxy/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: status === "active" ? "disabled" : "active" }),
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <button onClick={toggle} disabled={pending} className="disabled:opacity-50">
      <Pill tone={status === "active" ? "success" : "neutral"}>{pending ? "…" : status === "active" ? "Active" : "Disabled"}</Pill>
    </button>
  );
}
