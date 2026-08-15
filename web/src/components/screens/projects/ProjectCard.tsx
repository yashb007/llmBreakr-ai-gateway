"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { EditProjectModal } from "./EditProjectModal";
import { formatCompactNumber, formatUsd } from "@/lib/format";
import type { Project, UsageResponse } from "@/types/api";

export function ProjectCard({
  project,
  usage,
  keyCount,
}: {
  project: Project;
  usage: UsageResponse | null;
  keyCount: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  return (
    <div className="relative">
      <Link href={`/projects/${project.id}`} className="block">
        <Card className="p-[18px] transition-colors hover:border-border2">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-accent-soft text-accent">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
            </div>
            <div className="flex-1 pr-6">
              <div className="text-sm font-bold">{project.name}</div>
              <div className="mt-0.5 text-xs text-txm">{project.description}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-[26px] gap-y-3 border-t border-border pt-3">
            <div>
              <div className="mb-0.5 text-[11px] text-txd">Virtual keys</div>
              <div className="font-mono text-[17px] font-extrabold">{keyCount}</div>
            </div>
            <div>
              <div className="mb-0.5 text-[11px] text-txd">Spend (30d)</div>
              <div className="font-mono text-[17px] font-extrabold">
                {usage ? formatUsd(usage.totals.cost_usd) : "—"}
              </div>
            </div>
            <div>
              <div className="mb-0.5 text-[11px] text-txd">Requests</div>
              <div className="font-mono text-[17px] font-extrabold">
                {usage ? formatCompactNumber(usage.totals.requests) : "—"}
              </div>
            </div>
            <div>
              <div className="mb-0.5 text-[11px] text-txd">RPM limit</div>
              <div className="font-mono text-[17px] font-extrabold">{project.rpm_limit ?? "∞"}</div>
            </div>
            <div>
              <div className="mb-0.5 text-[11px] text-txd">Daily budget</div>
              <div className="font-mono text-[17px] font-extrabold">
                {project.daily_budget_usd ? formatUsd(project.daily_budget_usd) : "No cap"}
              </div>
            </div>
          </div>
        </Card>
      </Link>

      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setEditing(true);
        }}
        className="absolute right-[18px] top-[18px] p-1 text-txd hover:text-tx"
        title="Edit project"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>

      <EditProjectModal
        open={editing}
        onClose={() => setEditing(false)}
        project={project}
        onSaved={() => router.refresh()}
        onDeleted={() => router.refresh()}
      />
    </div>
  );
}
