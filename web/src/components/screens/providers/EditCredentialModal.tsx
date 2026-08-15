"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Label } from "@/components/ui/Input";
import { clientFetch } from "@/lib/client-fetch";
import { formatDate } from "@/lib/format";
import { PROVIDERS } from "./AddCredentialModal";
import type { ProviderCredential } from "@/types/api";

export function EditCredentialModal({
  open,
  onClose,
  credential,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  credential: ProviderCredential;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [provider, setProvider] = useState(credential.provider);
  const [name, setName] = useState(credential.name);
  const [description, setDescription] = useState(credential.description ?? "");
  const [apiKey, setApiKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setApiKey("");
    setError(null);
    setConfirmingDelete(false);
    onClose();
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const updates: { provider?: string; name?: string; description?: string; api_key?: string } = {};
      if (provider !== credential.provider) updates.provider = provider;
      if (name !== credential.name) updates.name = name;
      if (description !== (credential.description ?? "")) updates.description = description;
      if (apiKey) updates.api_key = apiKey;
      if (Object.keys(updates).length > 0) {
        await clientFetch(`/api/proxy/provider-creds/${credential.id}`, {
          method: "PATCH",
          body: JSON.stringify(updates),
        });
      }
      close();
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update credential");
    } finally {
      setSubmitting(false);
    }
  };

  const del = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await clientFetch(`/api/proxy/provider-creds/${credential.id}`, { method: "DELETE" });
      close();
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete credential");
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  return (
    <Modal open={open} onClose={close} width={480}>
      <div className="p-[22px]">
        <div className="mb-1 flex items-center justify-between">
          <div className="text-[17px] font-extrabold tracking-tight">Edit credential</div>
          <button onClick={close} className="p-1 text-txd hover:text-tx">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="mb-4 mt-1 text-[12.5px] text-txm">Added {formatDate(credential.created_at)}</p>

        <div className="mb-4">
          <Label>PROVIDER</Label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full rounded-[9px] border border-border bg-bg px-3 py-2.5 text-[13px] text-tx capitalize outline-none focus:border-accent"
          >
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <Field label="NAME">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </div>
        <div className="mb-4">
          <Field label="DESCRIPTION">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>
        <div className="mb-5">
          <Field label="API KEY">
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Leave blank to keep unchanged"
              className="font-mono"
            />
          </Field>
        </div>

        {error && <p className="mb-4 text-[12.5px] font-semibold text-red">{error}</p>}

        <div className="flex items-center justify-between gap-2.5">
          <button
            onClick={del}
            disabled={deleting}
            className="rounded-[10px] border border-border bg-panel2 px-3 py-2.5 text-[12.5px] font-bold text-red hover:border-red disabled:opacity-50"
          >
            {deleting ? "Deleting…" : confirmingDelete ? "Click again to confirm" : "Delete credential"}
          </button>
          <div className="flex gap-2.5">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!name || submitting}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
