"use client";

import { useState } from "react";
import { Pill } from "@/components/ui/Pill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { clientFetch } from "@/lib/client-fetch";
import { formatCompactNumber, formatUsd } from "@/lib/format";
import { useKeySpendToday } from "@/hooks/useKeySpendToday";
import { EditKeyModal } from "./EditKeyModal";
import type { ProjectOption, VirtualKey, VirtualKeyTestResult } from "@/types/api";

export function KeyRow({
  vkey,
  project,
  onChanged,
}: {
  vkey: VirtualKey;
  project?: ProjectOption;
  onChanged: () => void;
}) {
  const [revoking, setRevoking] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<VirtualKeyTestResult | null>(null);
  const { spend, inputTokens, outputTokens, cachedTokens } = useKeySpendToday(vkey.id);
  const budget = vkey.daily_budget_usd;
  const spendPct = budget ? (spend / budget) * 100 : 0;
  const spendColor = spendPct > 80 ? "var(--color-red)" : spendPct > 60 ? "var(--color-amber)" : "var(--color-accent2)";

  const revoke = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRevoking(true);
    try {
      await clientFetch(`/api/proxy/virtual-keys/${vkey.id}/revoke`, { method: "POST" });
      onChanged();
    } finally {
      setRevoking(false);
    }
  };

  const test = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setTesting(true);
    setTestResult(null);
    try {
      setTestResult(await clientFetch<VirtualKeyTestResult>(`/api/proxy/virtual-keys/${vkey.id}/test`, { method: "POST" }));
    } catch (err) {
      setTestResult({ ok: false, error: err instanceof Error ? err.message : "Test failed" });
    } finally {
      setTesting(false);
    }
  };

  const approve = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setApproving(true);
    setApproveError(null);
    try {
      await clientFetch(`/api/proxy/virtual-keys/${vkey.id}/approve`, { method: "POST" });
      onChanged();
    } catch (err) {
      setApproveError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setApproving(false);
    }
  };

  return (
    <>
      <div
        onClick={() => setEditing(true)}
        className="grid cursor-pointer grid-cols-[1.5fr_1fr_0.8fr_0.8fr_1fr_170px] items-center gap-3 border-b border-white/4 px-[18px] py-3.5 text-[12.5px] last:border-b-0 hover:bg-white/2"
      >
        <div className="min-w-0">
          <div className={vkey.revoked ? "font-bold text-txd line-through" : "font-bold"}>
            {vkey.name}
            {!vkey.revoked && !vkey.approved && (
              <Pill tone="warning" className="ml-1.5">
                Pending
              </Pill>
            )}
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-txd">{vkey.key_prefix}…</div>
        </div>
        <span className="text-txm">{project?.name ?? "—"}</span>
        <span className="text-right font-mono">{vkey.rpm_limit ?? "∞"}</span>
        <span className="text-right font-mono">{budget ? formatUsd(budget) + "/d" : "—"}</span>
        <div>
          {budget ? <ProgressBar pct={spendPct} color={spendColor} /> : <div className="mb-1 h-1.5" />}
          <span className="font-mono text-[11px] text-txm">{formatUsd(spend)}</span>
          <div
            className="mt-0.5 truncate font-mono text-[10px] text-txd"
            title={`${inputTokens.toLocaleString()} input · ${outputTokens.toLocaleString()} output · ${cachedTokens.toLocaleString()} cached tokens today`}
          >
            {formatCompactNumber(inputTokens)} in · {formatCompactNumber(outputTokens)} out · {formatCompactNumber(cachedTokens)} cached
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {vkey.revoked ? (
            <Pill tone="error">Revoked</Pill>
          ) : !vkey.approved ? (
            <button
              onClick={approve}
              disabled={approving}
              title={approveError ?? "Allow this key to authenticate data-plane requests"}
              className={`rounded-[8px] border px-2.5 py-1 text-[11.5px] font-semibold disabled:opacity-50 ${
                approveError
                  ? "border-red text-red"
                  : "border-border bg-panel2 text-txm hover:border-accent2 hover:text-accent2"
              }`}
            >
              {approving ? "…" : approveError ? "Retry" : "Approve"}
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={test}
                disabled={testing}
                title={
                  testResult
                    ? testResult.ok
                      ? `${testResult.model} · ${testResult.latency_ms}ms · "${testResult.reply}"`
                      : testResult.error
                    : "Send a fixed test prompt through this key"
                }
                className="rounded-[8px] border border-border bg-panel2 px-2.5 py-1 text-[11.5px] font-semibold text-txm hover:border-accent hover:text-accent disabled:opacity-50"
              >
                {testing ? "…" : "Test"}
              </button>
              <button
                onClick={revoke}
                disabled={revoking}
                className="rounded-[8px] border border-border bg-panel2 px-2.5 py-1 text-[11.5px] font-semibold text-txm hover:border-red hover:text-red disabled:opacity-50"
              >
                {revoking ? "…" : "Revoke"}
              </button>
            </div>
          )}
          {testResult && (
            <Pill tone={testResult.ok ? "success" : "error"} className="max-w-[160px] truncate">
              {testResult.ok ? `OK · ${testResult.latency_ms}ms` : testResult.error}
            </Pill>
          )}
        </div>
      </div>

      <EditKeyModal
        open={editing}
        onClose={() => setEditing(false)}
        vkey={vkey}
        project={project}
        onSaved={onChanged}
        onDeleted={onChanged}
      />
    </>
  );
}
