"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EditProjectModal } from "./EditProjectModal";
import type { Project } from "@/types/api";

export function ProjectHeaderActions({ project }: { project: Project }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  return (
    <>
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 rounded-[9px] border border-border bg-panel2 px-3 py-2 text-[12.5px] font-bold text-txm hover:border-border2 hover:text-tx"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Edit project
      </button>
      <EditProjectModal
        open={editing}
        onClose={() => setEditing(false)}
        project={project}
        onSaved={() => router.refresh()}
        onDeleted={() => router.push("/projects")}
      />
    </>
  );
}
