"use client";

import { useState } from "react";
import { NewUserModal } from "./NewUserModal";
import type { Role } from "@/types/api";

export function NewUserButton({ roles }: { roles: Role[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-[11.5px] font-bold text-accent hover:text-[#a49dff]"
      >
        + New user
      </button>
      <NewUserModal open={open} onClose={() => setOpen(false)} roles={roles} />
    </>
  );
}
