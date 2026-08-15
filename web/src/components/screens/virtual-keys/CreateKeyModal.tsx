"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Label } from "@/components/ui/Input";
import { clientFetch } from "@/lib/client-fetch";
import type { ProjectOption, VirtualKeyWithSecret } from "@/types/api";

export function CreateKeyModal({
  open,
  onClose,
  projects,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  projects: ProjectOption[];
  onCreated: () => void;
}) {
  const [step, setStep] = useState<"form" | "reveal">("form");
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState<string>(projects[0]?.id.toString() ?? "");
  const [rpmLimit, setRpmLimit] = useState("60");
  const [dailyBudget, setDailyBudget] = useState("");
  const [dailyTokenLimit, setDailyTokenLimit] = useState("");
  const [monthlyTokenLimit, setMonthlyTokenLimit] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<VirtualKeyWithSecret | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setStep("form");
    setName("");
    setRpmLimit("60");
    setDailyBudget("");
    setDailyTokenLimit("");
    setMonthlyTokenLimit("");
    setError(null);
    setNewKey(null);
    setCopied(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const key = await clientFetch<VirtualKeyWithSecret>("/api/proxy/virtual-keys", {
        method: "POST",
        body: JSON.stringify({
          project_id: Number(projectId),
          name,
          rpm_limit: rpmLimit ? Number(rpmLimit) : undefined,
          daily_budget_usd: dailyBudget ? Number(dailyBudget) : undefined,
          daily_token_limit: dailyTokenLimit ? Number(dailyTokenLimit) : undefined,
          monthly_token_limit: monthlyTokenLimit ? Number(monthlyTokenLimit) : undefined,
        }),
      });
      setNewKey(key);
      setStep("reveal");
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create key");
    } finally {
      setSubmitting(false);
    }
  };

  const copy = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey.key).catch(() => {});
    setCopied(true);
  };

  return (
    <Modal open={open} onClose={close}>
      {step === "form" ? (
        <div className="p-[22px]">
          <div className="mb-1 flex items-center justify-between">
            <div className="text-[17px] font-extrabold tracking-tight">New virtual key</div>
            <button onClick={close} className="p-1 text-txd hover:text-tx">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="mb-5 text-[12.5px] text-txm">The secret is generated server-side and shown exactly once.</p>

          <div className="mb-4">
            <Field label="NAME">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Marketing Bot — prod"
                required
              />
            </Field>
          </div>

          <div className="mb-4 flex gap-3">
            <div className="flex-1">
              <Label>PROJECT</Label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-[9px] border border-border bg-bg px-3 py-2.5 text-[13px] text-tx outline-none focus:border-accent"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-[120px]">
              <Field label="RPM LIMIT">
                <Input
                  type="number"
                  min={1}
                  value={rpmLimit}
                  onChange={(e) => setRpmLimit(e.target.value)}
                  className="font-mono"
                />
              </Field>
            </div>
          </div>

          <div className="mb-4 flex gap-3">
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

          <p className="mb-5 text-[11.5px] text-txd">
            This key can call any model allowed for its project — manage that from the project&apos;s detail page.
          </p>

          {error && <p className="mb-4 text-[12.5px] font-semibold text-red">{error}</p>}

          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!name || !projectId || submitting}>
              {submitting ? "Creating…" : "Create key"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="px-6 py-[26px] text-center">
          <div className="mx-auto mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[rgba(55,214,154,.13)]">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent2)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div className="mb-1.5 text-[17px] font-extrabold tracking-tight">Key created</div>
          <p className="mb-5 text-[12.5px] leading-relaxed text-txm">
            Copy it now — for security this secret is <strong className="text-tx">never shown again</strong>.
          </p>
          <p className="mb-5 -mt-3 text-[12px] leading-relaxed text-amber">
            This key is pending approval and won&apos;t authenticate requests until someone with virtual key
            management rights approves it.
          </p>
          <div className="mb-5 flex items-center gap-2.5 rounded-[11px] border border-border2 bg-bg px-3.5 py-3">
            <span className="flex-1 break-all text-left font-mono text-[12.5px] text-accent2">{newKey?.key}</span>
            <button
              onClick={copy}
              className="flex-none rounded-[8px] border border-border bg-panel2 p-1.5 text-txm hover:border-border2 hover:text-tx"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15V5a2 2 0 0 1 2-2h10" />
              </svg>
            </button>
          </div>
          <Button onClick={close} className="w-full justify-center">
            {copied ? "Copied — done" : "Copy & finish"}
          </Button>
        </div>
      )}
    </Modal>
  );
}
