"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Label } from "@/components/ui/Input";
import { clientFetch } from "@/lib/client-fetch";
import type { Project, ProviderCredential } from "@/types/api";

export function NewProjectButton({ credentials }: { credentials: ProviderCredential[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dailyBudget, setDailyBudget] = useState("");
  const [rpmLimit, setRpmLimit] = useState("");
  const [dailyTokenLimit, setDailyTokenLimit] = useState("");
  const [monthlyTokenLimit, setMonthlyTokenLimit] = useState("");
  const [credentialId, setCredentialId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setName("");
    setDescription("");
    setDailyBudget("");
    setRpmLimit("");
    setDailyTokenLimit("");
    setMonthlyTokenLimit("");
    setCredentialId("");
    setError(null);
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const project = await clientFetch<Project>("/api/proxy/projects", {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          daily_budget_usd: dailyBudget ? Number(dailyBudget) : undefined,
          rpm_limit: rpmLimit ? Number(rpmLimit) : undefined,
          daily_token_limit: dailyTokenLimit ? Number(dailyTokenLimit) : undefined,
          monthly_token_limit: monthlyTokenLimit ? Number(monthlyTokenLimit) : undefined,
        }),
      });

      // Best-effort: the project itself is already created at this point —
      // a failure attaching the starting credential shouldn't be reported as
      // "project creation failed" (the admin can just attach it from the
      // project's detail page instead).
      if (credentialId) {
        await clientFetch("/api/proxy/project-credentials", {
          method: "POST",
          body: JSON.stringify({ project_id: project.id, provider_credential_id: Number(credentialId) }),
        }).catch(() => {});
      }

      close();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        New project
      </Button>
      <Modal open={open} onClose={close}>
        <div className="p-[22px]">
          <div className="mb-1 flex items-center justify-between">
            <div className="text-[17px] font-extrabold tracking-tight">New project</div>
            <button onClick={close} className="p-1 text-txd hover:text-tx">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="mb-5 text-[12.5px] text-txm">The grouping and attribution unit every virtual key belongs to.</p>

          <div className="mb-4">
            <Field label="NAME">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Marketing Bot" />
            </Field>
          </div>
          <div className="mb-4">
            <Field label="DESCRIPTION">
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this project for?" />
            </Field>
          </div>
          <div className="mb-4">
            <Label>PROVIDER CREDENTIAL (OPTIONAL)</Label>
            <select
              value={credentialId}
              onChange={(e) => setCredentialId(e.target.value)}
              disabled={credentials.length === 0}
              className="w-full rounded-[9px] border border-border bg-bg px-3 py-2.5 text-[13px] text-tx outline-none focus:border-accent disabled:opacity-50"
            >
              <option value="">{credentials.length === 0 ? "No credentials exist yet" : "None — attach later"}</option>
              {credentials.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.provider})
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-txd">
              You&apos;ll still need to allow specific models from the project&apos;s detail page.
            </p>
          </div>
          <div className="mb-5 flex gap-3">
            <div className="flex-1">
              <Field label="RPM LIMIT">
                <Input
                  type="number"
                  min={1}
                  value={rpmLimit}
                  onChange={(e) => setRpmLimit(e.target.value)}
                  placeholder="No limit"
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
                  placeholder="No cap"
                />
              </Field>
            </div>
          </div>
          <div className="mb-5 flex gap-3">
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
          <p className="mb-5 -mt-3 text-[11.5px] text-txd">All limits roll up across every key in this project.</p>

          {error && <p className="mb-4 text-[12.5px] font-semibold text-red">{error}</p>}

          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!name || !description || submitting}>
              {submitting ? "Creating…" : "Create project"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
