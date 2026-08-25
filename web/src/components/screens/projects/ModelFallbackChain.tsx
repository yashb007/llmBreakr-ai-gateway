"use client";

import { useState } from "react";
import { clientFetch, ClientApiError } from "@/lib/client-fetch";
import { providerColor } from "@/lib/providerColors";
import type { ProjectModel, ProjectModelFallback } from "@/types/api";

// Expandable per-model fallback chain, rendered inline under a row in
// ProjectAccessCard's "Allowed models" list. `chain` is this one model's
// links only (already filtered + priority-sorted by the parent), `allModels`
// is every model the project is allowed to call, for the "add" picker.
export function ModelFallbackChain({
  projectId,
  model,
  allModels,
  chain,
  onChanged,
}: {
  projectId: number;
  model: ProjectModel;
  allModels: ProjectModel[];
  chain: ProjectModelFallback[];
  onChanged: () => void;
}) {
  const [candidateId, setCandidateId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const chainedIds = new Set(chain.map((f) => f.fallback_project_model_id));
  const candidates = allModels.filter((m) => m.id !== model.id && !chainedIds.has(m.id));

  const addFallback = async () => {
    if (!candidateId) return;
    setAdding(true);
    setError(null);
    try {
      await clientFetch("/api/proxy/project-model-fallbacks", {
        method: "POST",
        body: JSON.stringify({
          project_id: projectId,
          primary_project_model_id: model.id,
          fallback_project_model_id: Number(candidateId),
          priority: chain.length,
        }),
      });
      setCandidateId("");
      onChanged();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Failed to add fallback");
    } finally {
      setAdding(false);
    }
  };

  const removeFallback = async (id: number) => {
    setBusyId(id);
    try {
      await clientFetch(`/api/proxy/project-model-fallbacks/${id}?project_id=${projectId}`, { method: "DELETE" });
      onChanged();
    } finally {
      setBusyId(null);
    }
  };

  // Swaps this entry's priority with its neighbor in `direction` — two PATCHes,
  // simplest way to reorder without a drag-and-drop dependency for a list
  // that's rarely more than a couple of entries long.
  const move = async (index: number, direction: -1 | 1) => {
    const current = chain[index];
    const other = chain[index + direction];
    if (!current || !other) return;
    setBusyId(current.id);
    try {
      await Promise.all([
        clientFetch(`/api/proxy/project-model-fallbacks/${current.id}?project_id=${projectId}`, {
          method: "PATCH",
          body: JSON.stringify({ priority: other.priority }),
        }),
        clientFetch(`/api/proxy/project-model-fallbacks/${other.id}?project_id=${projectId}`, {
          method: "PATCH",
          body: JSON.stringify({ priority: current.priority }),
        }),
      ]);
      onChanged();
    } finally {
      setBusyId(null);
    }
  };

  const selectClass =
    "flex-1 rounded-[8px] border border-border bg-bg px-2.5 py-1.5 text-[12px] text-tx outline-none focus:border-accent disabled:opacity-50";
  const addBtnClass =
    "rounded-[8px] border border-border bg-panel2 px-2.5 py-1.5 text-[12px] font-bold text-tx hover:border-accent disabled:opacity-50";
  const iconBtnClass = "text-txd hover:text-tx disabled:opacity-30 disabled:hover:text-txd";

  return (
    <div className="mt-2 rounded-[8px] border border-dashed border-border bg-bg/40 px-3 py-2.5">
      <div className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-txd">
        Fallback chain — tried in order if {model.model_id} fails
      </div>

      {chain.length > 0 ? (
        <div className="mb-2 flex flex-col gap-1">
          {chain.map((f, i) => (
            <div key={f.id} className="flex items-center justify-between rounded-[7px] border border-border bg-panel2 px-2.5 py-1.5 text-[12px]">
              <span className="flex items-center gap-2">
                <span className="font-mono text-txd">{i + 1}.</span>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: providerColor(f.fallback_model?.provider ?? "") }} />
                <span className="font-mono font-bold">{f.fallback_model?.model_id}</span>
              </span>
              <span className="flex items-center gap-2">
                <button onClick={() => move(i, -1)} disabled={i === 0 || busyId === f.id} className={iconBtnClass} title="Move up" aria-label="Move up">
                  ↑
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === chain.length - 1 || busyId === f.id}
                  className={iconBtnClass}
                  title="Move down"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button onClick={() => removeFallback(f.id)} disabled={busyId === f.id} className="text-[11px] font-semibold text-txd hover:text-red">
                  Remove
                </button>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-2 text-[11.5px] text-txd">No fallback configured — a failure here returns straight to the caller.</p>
      )}

      {candidates.length > 0 ? (
        <div className="flex gap-2">
          <select value={candidateId} onChange={(e) => setCandidateId(e.target.value)} className={selectClass}>
            <option value="">Add a fallback model…</option>
            {candidates.map((m) => (
              <option key={m.id} value={m.id}>
                {m.provider} / {m.model_id}
              </option>
            ))}
          </select>
          <button onClick={addFallback} disabled={!candidateId || adding} className={addBtnClass}>
            {adding ? "…" : "Add"}
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-txd">No other allowed models to fall back to yet.</p>
      )}
      {error && <p className="mt-1.5 text-[11px] font-semibold text-red">{error}</p>}
    </div>
  );
}
