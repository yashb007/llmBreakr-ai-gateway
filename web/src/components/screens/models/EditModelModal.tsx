"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { clientFetch } from "@/lib/client-fetch";
import type { ProviderModel } from "@/types/api";

export function EditModelModal({
  open,
  onClose,
  model,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  model: ProviderModel;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [inputPrice, setInputPrice] = useState(model.input_price_per_million?.toString() ?? "");
  const [outputPrice, setOutputPrice] = useState(model.output_price_per_million?.toString() ?? "");
  const [cacheWritePrice, setCacheWritePrice] = useState(model.cache_write_price_per_million?.toString() ?? "");
  const [cacheReadPrice, setCacheReadPrice] = useState(model.cache_read_price_per_million?.toString() ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    setConfirmingDelete(false);
    onClose();
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await clientFetch(`/api/proxy/models/${model.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          input_price_per_million: inputPrice === "" ? null : Number(inputPrice),
          output_price_per_million: outputPrice === "" ? null : Number(outputPrice),
          cache_write_price_per_million: cacheWritePrice === "" ? null : Number(cacheWritePrice),
          cache_read_price_per_million: cacheReadPrice === "" ? null : Number(cacheReadPrice),
        }),
      });
      close();
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update model");
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
      await clientFetch(`/api/proxy/models/${model.id}`, { method: "DELETE" });
      close();
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete model");
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  return (
    <Modal open={open} onClose={close}>
      <div className="p-[22px]">
        <div className="mb-1 flex items-center justify-between">
          <div className="text-[17px] font-extrabold tracking-tight">Edit pricing</div>
          <button onClick={close} className="p-1 text-txd hover:text-tx">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-1 font-mono text-[13px] text-txm">
          {model.provider} / {model.model_id}
        </div>

        <div className="mb-4 mt-5 grid grid-cols-2 gap-3">
          <Field label="INPUT $ / 1M TOKENS">
            <Input
              type="number"
              min="0"
              step="any"
              value={inputPrice}
              onChange={(e) => setInputPrice(e.target.value)}
              placeholder="Unset — $0"
            />
          </Field>
          <Field label="OUTPUT $ / 1M TOKENS">
            <Input
              type="number"
              min="0"
              step="any"
              value={outputPrice}
              onChange={(e) => setOutputPrice(e.target.value)}
              placeholder="Unset — $0"
            />
          </Field>
          {model.provider === "anthropic" && (
            <Field label="CACHE WRITE $ / 1M TOKENS">
              <Input
                type="number"
                min="0"
                step="any"
                value={cacheWritePrice}
                onChange={(e) => setCacheWritePrice(e.target.value)}
                placeholder="Unset — $0"
              />
            </Field>
          )}
          <Field label="CACHE READ $ / 1M TOKENS">
            <Input
              type="number"
              min="0"
              step="any"
              value={cacheReadPrice}
              onChange={(e) => setCacheReadPrice(e.target.value)}
              placeholder="Unset — $0"
            />
          </Field>
        </div>
        <p className="mb-5 -mt-2 text-[11.5px] text-txd">
          No provider exposes pricing via API — this is manually maintained.
          {model.provider !== "anthropic" &&
            " Cache write doesn't apply to this provider — caching is automatic with no separate write charge."}
        </p>

        {error && <p className="mb-4 text-[12.5px] font-semibold text-red">{error}</p>}

        <div className="flex items-center justify-between gap-2.5">
          <button
            onClick={del}
            disabled={deleting}
            className="rounded-[10px] border border-border bg-panel2 px-3 py-2.5 text-[12.5px] font-bold text-red hover:border-red disabled:opacity-50"
          >
            {deleting ? "Deleting…" : confirmingDelete ? "Click again to confirm" : "Delete model"}
          </button>
          <div className="flex gap-2.5">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
