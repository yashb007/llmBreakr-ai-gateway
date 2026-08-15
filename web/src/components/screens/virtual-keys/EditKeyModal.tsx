"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Label } from "@/components/ui/Input";
import { clientFetch } from "@/lib/client-fetch";
import type { ProjectOption, VirtualKey } from "@/types/api";

export function EditKeyModal({
  open,
  onClose,
  vkey,
  project,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  vkey: VirtualKey;
  project?: ProjectOption;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(vkey.name);
  const [rpmLimit, setRpmLimit] = useState(vkey.rpm_limit?.toString() ?? "");
  const [dailyBudget, setDailyBudget] = useState(vkey.daily_budget_usd?.toString() ?? "");
  const [dailyTokenLimit, setDailyTokenLimit] = useState(vkey.daily_token_limit?.toString() ?? "");
  const [monthlyTokenLimit, setMonthlyTokenLimit] = useState(vkey.monthly_token_limit?.toString() ?? "");
  const [expiresAt, setExpiresAt] = useState(vkey.expires_at ? vkey.expires_at.slice(0, 10) : "");
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
      await clientFetch(`/api/proxy/virtual-keys/${vkey.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          rpm_limit: rpmLimit ? Number(rpmLimit) : null,
          daily_budget_usd: dailyBudget ? Number(dailyBudget) : null,
          daily_token_limit: dailyTokenLimit ? Number(dailyTokenLimit) : null,
          monthly_token_limit: monthlyTokenLimit ? Number(monthlyTokenLimit) : null,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });
      close();
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update key");
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
      await clientFetch(`/api/proxy/virtual-keys/${vkey.id}`, { method: "DELETE" });
      close();
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete key");
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  return (
    <Modal open={open} onClose={close} width={480}>
      <div className="p-[22px]">
        <div className="mb-1 flex items-center justify-between">
          <div className="text-[17px] font-extrabold tracking-tight">Edit virtual key</div>
          <button onClick={close} className="p-1 text-txd hover:text-tx">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="mb-4 mt-1 font-mono text-[12.5px] text-txm">
          {vkey.key_prefix}… · {project?.name ?? "—"}
          {!vkey.revoked && (
            <span className={vkey.approved ? "text-accent2" : "text-amber"}> · {vkey.approved ? "Approved" : "Pending approval"}</span>
          )}
        </p>

        <div className="mb-4">
          <Field label="NAME">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </div>
        <div className="mb-4 flex gap-3">
          <div className="flex-1">
            <Field label="RPM LIMIT">
              <Input
                type="number"
                min={1}
                value={rpmLimit}
                onChange={(e) => setRpmLimit(e.target.value)}
                placeholder="No limit"
                className="font-mono"
              />
            </Field>
          </div>
          <div className="flex-1">
            <Field label="DAILY BUDGET (USD)">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={dailyBudget}
                onChange={(e) => setDailyBudget(e.target.value)}
                placeholder="No limit"
                className="font-mono"
              />
            </Field>
          </div>
        </div>
        <div className="mb-4 flex gap-3">
          <div className="flex-1">
            <Field label="DAILY TOKEN LIMIT">
              <Input
                type="number"
                min={1}
                value={dailyTokenLimit}
                onChange={(e) => setDailyTokenLimit(e.target.value)}
                placeholder="No limit"
                className="font-mono"
              />
            </Field>
          </div>
          <div className="flex-1">
            <Field label="MONTHLY TOKEN LIMIT">
              <Input
                type="number"
                min={1}
                value={monthlyTokenLimit}
                onChange={(e) => setMonthlyTokenLimit(e.target.value)}
                placeholder="No limit"
                className="font-mono"
              />
            </Field>
          </div>
        </div>
        <div className="mb-5">
          <Label>EXPIRES</Label>
          <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="font-mono" />
        </div>

        {error && <p className="mb-4 text-[12.5px] font-semibold text-red">{error}</p>}

        <div className="flex items-center justify-between gap-2.5">
          <button
            onClick={del}
            disabled={deleting}
            className="rounded-[10px] border border-border bg-panel2 px-3 py-2.5 text-[12.5px] font-bold text-red hover:border-red disabled:opacity-50"
          >
            {deleting ? "Deleting…" : confirmingDelete ? "Click again to confirm" : "Delete key"}
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
