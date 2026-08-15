"use client";

import { useState } from "react";
import { Pill } from "@/components/ui/Pill";
import { EditRoleModal } from "./EditRoleModal";
import type { Role } from "@/types/api";

export function RoleCard({
  role,
  allPermissions,
  userCount,
}: {
  role: Role;
  allPermissions: string[];
  userCount: number;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="border-b border-white/4 px-[18px] py-3.5 last:border-b-0">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="text-[13px] font-bold">
          {role.name}
          {role.is_system && (
            <span className="ml-1.5 rounded-[5px] border border-border px-1.5 py-0.5 text-[9.5px] font-bold text-txd">
              SYSTEM
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[11px] text-txd">{userCount} users</span>
          <button onClick={() => setEditing(true)} className="p-0.5 text-txd hover:text-tx" title="Edit role">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>
      </div>
      <div className="mb-2 text-[11.5px] text-txm">{role.description}</div>
      <div className="flex flex-wrap gap-1.5">
        {(role.permissions ?? []).map((perm) => (
          <Pill key={perm} tone="neutral" className="font-mono">
            {perm}
          </Pill>
        ))}
      </div>
      <EditRoleModal open={editing} onClose={() => setEditing(false)} role={role} allPermissions={allPermissions} />
    </div>
  );
}
