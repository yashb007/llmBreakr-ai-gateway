"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { clientFetch } from "@/lib/client-fetch";
import type { Project } from "@/types/api";

export function EditProjectModal({
  open,
  onClose,
  project,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  project: Project;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [dailyBudget, setDailyBudget] = useState(project.daily_budget_usd?.toString() ?? "");
  const [rpmLimit, setRpmLimit] = useState(project.rpm_limit?.toString() ?? "");
  const [dailyTokenLimit, setDailyTokenLimit] = useState(project.daily_token_limit?.toString() ?? "");
  const [monthlyTokenLimit, setMonthlyTokenLimit] = useState(project.monthly_token_limit?.toString() ?? "");
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
      const updates: {
        name?: string;
        description?: string;
        daily_budget_usd?: number | null;
        rpm_limit?: number | null;
        daily_token_limit?: number | null;
        monthly_token_limit?: number | null;
      } = {};
      if (name !== project.name) updates.name = name;
      if (description !== project.description) updates.description = description;
      const newBudget = dailyBudget ? Number(dailyBudget) : null;
      if (newBudget !== (project.daily_budget_usd ?? null)) updates.daily_budget_usd = newBudget;
      const newRpmLimit = rpmLimit ? Number(rpmLimit) : null;
      if (newRpmLimit !== (project.rpm_limit ?? null)) updates.rpm_limit = newRpmLimit;
      const newDailyTokenLimit = dailyTokenLimit ? Number(dailyTokenLimit) : null;
      if (newDailyTokenLimit !== (project.daily_token_limit ?? null)) updates.daily_token_limit = newDailyTokenLimit;
      const newMonthlyTokenLimit = monthlyTokenLimit ? Number(monthlyTokenLimit) : null;
      if (newMonthlyTokenLimit !== (project.monthly_token_limit ?? null)) updates.monthly_token_limit = newMonthlyTokenLimit;
      if (Object.keys(updates).length > 0) {
        await clientFetch(`/api/proxy/projects/${project.id}`, {
          method: "PATCH",
          body: JSON.stringify(updates),
        });
      }
      close();
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update project");
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
      await clientFetch(`/api/proxy/projects/${project.id}`, { method: "DELETE" });
      close();
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete project");
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  return (
    <Modal open={open} onClose={close} width={460}>
      <div className="p-[22px]">
        <div className="mb-1 flex items-center justify-between">
          <div className="text-[17px] font-extrabold tracking-tight">Edit project</div>
          <button onClick={close} className="p-1 text-txd hover:text-tx">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 mt-4">
          <Field label="NAME">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </div>
        <div className="mb-4">
          <Field label="DESCRIPTION">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>
        <div className="mb-1 flex gap-3">
          <div className="flex-1">
            <Field label="RPM LIMIT">
              <Input type="number" min={1} value={rpmLimit} onChange={(e) => setRpmLimit(e.target.value)} placeholder="No limit" />
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
                placeholder="No cap"
              />
            </Field>
          </div>
        </div>
        <div className="mb-1 mt-4 flex gap-3">
          <div className="flex-1">
            <Field label="DAILY TOKEN LIMIT">
              <Input
                type="number"
                min={1}
                value={dailyTokenLimit}
                onChange={(e) => setDailyTokenLimit(e.target.value)}
                placeholder="No limit"
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
              />
            </Field>
          </div>
        </div>
        <p className="mb-5 mt-3 text-[11.5px] text-txd">All limits roll up across every key in this project.</p>

        {error && <p className="mb-4 text-[12.5px] font-semibold text-red">{error}</p>}

        <div className="flex items-center justify-between gap-2.5">
          <button
            onClick={del}
            disabled={deleting}
            className="rounded-[10px] border border-border bg-panel2 px-3 py-2.5 text-[12.5px] font-bold text-red hover:border-red disabled:opacity-50"
          >
            {deleting ? "Deleting…" : confirmingDelete ? "Click again to confirm" : "Delete project"}
          </button>
          <div className="flex gap-2.5">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!name || !description || submitting}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
