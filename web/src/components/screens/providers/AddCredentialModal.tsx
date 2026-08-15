"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Label } from "@/components/ui/Input";
import { clientFetch } from "@/lib/client-fetch";

export const PROVIDERS = ["openai", "anthropic", "gemini"];

export function AddCredentialModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [provider, setProvider] = useState(PROVIDERS[0]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setName("");
    setDescription("");
    setApiKey("");
    setError(null);
    onClose();
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await clientFetch("/api/proxy/provider-creds", {
        method: "POST",
        body: JSON.stringify({ provider, name, description, api_key: apiKey }),
      });
      onCreated();
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add credential");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={close}>
      <div className="p-[22px]">
        <div className="mb-1 flex items-center justify-between">
          <div className="text-[17px] font-extrabold tracking-tight">Add credential</div>
          <button onClick={close} className="p-1 text-txd hover:text-tx">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="mb-5 text-[12.5px] text-txm">
          Encrypted at rest with AES-256-GCM. The raw key is never returned once stored.
        </p>

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
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Primary OpenAI key" />
          </Field>
        </div>
        <div className="mb-4">
          <Field label="DESCRIPTION">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this key used for?" />
          </Field>
        </div>
        <div className="mb-5">
          <Field label="API KEY">
            <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-…" className="font-mono" />
          </Field>
        </div>

        {error && <p className="mb-4 text-[12.5px] font-semibold text-red">{error}</p>}

        <div className="flex justify-end gap-2.5">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!name || !apiKey || submitting}>
            {submitting ? "Adding…" : "Add credential"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
