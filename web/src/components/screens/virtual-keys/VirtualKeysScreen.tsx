"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { swrFetcher } from "@/lib/client-fetch";
import { CreateKeyModal } from "./CreateKeyModal";
import { KeyRow } from "./KeyRow";
import type { ProjectOption, VirtualKey } from "@/types/api";

const COLS = "grid-cols-[1.5fr_1fr_0.8fr_0.8fr_1fr_170px]";

export function VirtualKeysScreen({
  initialKeys,
  projects,
}: {
  initialKeys: VirtualKey[];
  projects: ProjectOption[];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: keys, mutate } = useSWR<VirtualKey[]>("/api/proxy/virtual-keys", swrFetcher, {
    fallbackData: initialKeys,
  });

  const projectById = new Map(projects.map((p) => [p.id, p]));

  return (
    <div>
      <div className="mb-5 flex items-center">
        <div>
          <div className="text-[20px] font-extrabold tracking-tight">Virtual keys</div>
          <div className="mt-0.5 text-[13px] text-txm">
            Client-facing keys for the data-plane proxy. Secrets are shown once at creation.
          </div>
        </div>
        <div className="flex-1" />
        <Button onClick={() => setModalOpen(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New virtual key
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className={`grid ${COLS} gap-3 border-b border-border px-[18px] py-2.5 text-[10.5px] font-bold uppercase tracking-wide text-txd`}>
          <span>Name / prefix</span>
          <span>Project</span>
          <span className="text-right">RPM</span>
          <span className="text-right">Budget</span>
          <span>Spend / tokens today</span>
          <span />
        </div>
        {keys && keys.length > 0 ? (
          keys.map((k) => (
            <KeyRow key={k.id} vkey={k} project={projectById.get(k.project_id)} onChanged={() => mutate()} />
          ))
        ) : (
          <p className="px-[18px] py-10 text-center text-sm text-txd">No virtual keys yet.</p>
        )}
      </Card>

      <CreateKeyModal open={modalOpen} onClose={() => setModalOpen(false)} projects={projects} onCreated={() => mutate()} />
    </div>
  );
}
