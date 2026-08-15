"use client";

import { useState } from "react";
import { UserStatusToggle } from "./UserStatusToggle";
import { EditUserModal } from "./EditUserModal";
import type { Role, User } from "@/types/api";

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#5b8def,#37d69a)",
  "linear-gradient(135deg,#7b74ff,#c04dff)",
  "linear-gradient(135deg,#f6b64b,#f2585f)",
  "linear-gradient(135deg,#616873,#98a0ad)",
];

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserRow({
  user,
  index,
  roleNames,
  roles,
  assignedRoleIds,
  allPermissions,
  currentUserId,
}: {
  user: User;
  index: number;
  roleNames: string[];
  roles: Role[];
  assignedRoleIds: number[];
  allPermissions: string[];
  currentUserId: number;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <>
      <div className="grid grid-cols-[1.6fr_1.2fr_0.9fr_auto] items-center gap-3 border-b border-white/4 px-[18px] py-3 text-[12.5px] last:border-b-0 hover:bg-white/2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-[11px] font-bold text-[#0a0b0e]"
            style={{ background: AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length] }}
          >
            {initialsOf(user.name)}
          </span>
          <div className="min-w-0">
            <div className="truncate font-bold">
              {user.name}
              {user.is_super_admin && (
                <span className="ml-1.5 rounded-[5px] bg-[rgba(246,182,75,.13)] px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-wide text-amber">
                  SUPER
                </span>
              )}
            </div>
            <div className="truncate text-[11px] text-txd">{user.email}</div>
          </div>
        </div>
        <span className="text-txm">{roleNames.join(", ") || "—"}</span>
        <span>
          <UserStatusToggle userId={user.id} status={(user.status as "active" | "disabled") ?? "active"} />
        </span>
        <button onClick={() => setEditing(true)} className="p-1 text-txd hover:text-tx" title="Edit user">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </div>
      <EditUserModal
        open={editing}
        onClose={() => setEditing(false)}
        user={user}
        roles={roles}
        assignedRoleIds={assignedRoleIds}
        allPermissions={allPermissions}
        canDelete={user.id !== currentUserId}
      />
    </>
  );
}
