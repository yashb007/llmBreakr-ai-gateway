"use client";

import { useState } from "react";
import { NewRoleModal } from "./NewRoleModal";

export function NewRoleButton({ allPermissions }: { allPermissions: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-[11.5px] font-bold text-accent hover:text-[#a49dff]"
      >
        + New role
      </button>
      <NewRoleModal open={open} onClose={() => setOpen(false)} allPermissions={allPermissions} />
    </>
  );
}
