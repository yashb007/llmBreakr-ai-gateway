"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { swrFetcher } from "@/lib/client-fetch";
import { CreateKeyModal } from "@/components/screens/virtual-keys/CreateKeyModal";
import { KeyRow } from "@/components/screens/virtual-keys/KeyRow";
import type { Project, VirtualKey } from "@/types/api";

const COLS = "grid-cols-[1.5fr_1fr_0.8fr_0.8fr_1fr_90px]";

export function ProjectKeysScreen({
  project,
  initialKeys,
}: {
  project: Project;
  initialKeys: VirtualKey[];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: allKeys, mutate } = useSWR<VirtualKey[]>("/api/proxy/virtual-keys", swrFetcher, {
    fallbackData: initialKeys,
  });
  const keys = (allKeys ?? []).filter((k) => k.project_id === project.id);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-[18px] py-3">
        <span className="text-[13px] font-bold">Virtual keys</span>
        <Button onClick={() => setModalOpen(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New virtual key
        </Button>
      </div>

      <div className={`grid ${COLS} gap-3 border-b border-border px-[18px] py-2.5 text-[10.5px] font-bold uppercase tracking-wide text-txd`}>
        <span>Name / prefix</span>
        <span>Project</span>
        <span className="text-right">RPM</span>
        <span className="text-right">Budget</span>
        <span>Spend / tokens today</span>
        <span />
      </div>
      {keys.length > 0 ? (
        keys.map((k) => <KeyRow key={k.id} vkey={k} project={project} onChanged={() => mutate()} />)
      ) : (
        <p className="px-[18px] py-10 text-center text-sm text-txd">No virtual keys in this project yet.</p>
      )}

      <CreateKeyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        projects={[project]}
        onCreated={() => mutate()}
      />
    </Card>
  );
}
