"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { swrFetcher } from "@/lib/client-fetch";
import { providerBadge, providerColor } from "@/lib/providerColors";
import { formatDate } from "@/lib/format";
import { AddCredentialModal } from "./AddCredentialModal";
import { EditCredentialModal } from "./EditCredentialModal";
import type { ProviderCredential } from "@/types/api";

export function ProvidersScreen({ initialCredentials }: { initialCredentials: ProviderCredential[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<ProviderCredential | null>(null);
  const { data: credentials, mutate } = useSWR<ProviderCredential[]>("/api/proxy/provider-creds", swrFetcher, {
    fallbackData: initialCredentials,
  });

  return (
    <div>
      <div className="mb-5 flex items-center">
        <div>
          <div className="text-[20px] font-extrabold tracking-tight">Provider credentials</div>
          <div className="mt-0.5 text-[13px] text-txm">
            Real upstream API keys, encrypted at rest with AES-256-GCM. Secrets never leave the server.
          </div>
        </div>
        <div className="flex-1" />
        <Button onClick={() => setModalOpen(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add credential
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
        {credentials && credentials.length > 0 ? (
          credentials.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer p-[18px] transition-colors hover:border-border2"
              onClick={() => setEditingCredential(c)}
            >
              <div className="mb-3.5 flex items-center gap-2.5">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-[11px] text-[15px] font-extrabold text-white"
                  style={{ background: providerColor(c.provider) }}
                >
                  {providerBadge(c.provider)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-bold">{c.name}</div>
                  <div className="text-[11.5px] capitalize text-txd">{c.provider}</div>
                </div>
                <span className="h-2 w-2 rounded-full bg-accent2 shadow-[0_0_7px_var(--color-accent2)]" />
              </div>
              <p className="mb-3.5 min-h-[36px] text-xs leading-relaxed text-txm">{c.description || "No description."}</p>
              <div className="flex items-center gap-2 rounded-[8px] border border-border bg-bg px-2.5 py-2 font-mono text-xs text-txd">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="11" width="18" height="10" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                ••••••••••••••••
              </div>
              <div className="mt-3.5 flex justify-end text-[11.5px] text-txd">
                <span>Added {formatDate(c.created_at)}</span>
              </div>
            </Card>
          ))
        ) : (
          <p className="col-span-full py-10 text-center text-sm text-txd">No provider credentials yet.</p>
        )}
      </div>

      <AddCredentialModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={() => mutate()} />
      {editingCredential && (
        <EditCredentialModal
          open={!!editingCredential}
          onClose={() => setEditingCredential(null)}
          credential={editingCredential}
          onSaved={() => mutate()}
          onDeleted={() => mutate()}
        />
      )}
    </div>
  );
}
