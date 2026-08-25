"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card } from "@/components/ui/Card";
import { swrFetcher, clientFetch, ClientApiError } from "@/lib/client-fetch";
import { providerColor } from "@/lib/providerColors";
import type { ProjectModel, ProjectModelFallback, ProjectProviderCredential, ProviderCredential, ProviderModel } from "@/types/api";
import { ModelFallbackChain } from "./ModelFallbackChain";

// Both sections share one card since "which models a project can call" is
// gated by both lists together: a model is only reachable if its provider
// has a credential attached here AND the model itself is allowed below.
export function ProjectAccessCard({
  projectId,
  allCredentials,
  catalog,
}: {
  projectId: number;
  allCredentials: ProviderCredential[];
  catalog: ProviderModel[];
}) {
  const { data: projectCredentials, mutate: mutateCredentials } = useSWR<ProjectProviderCredential[]>(
    `/api/proxy/project-credentials?project_id=${projectId}`,
    swrFetcher
  );
  const { data: projectModels, mutate: mutateModels } = useSWR<ProjectModel[]>(
    `/api/proxy/project-models?project_id=${projectId}`,
    swrFetcher
  );
  const { data: fallbacks, mutate: mutateFallbacks } = useSWR<ProjectModelFallback[]>(
    `/api/proxy/project-model-fallbacks?project_id=${projectId}`,
    swrFetcher
  );
  const [expandedModelId, setExpandedModelId] = useState<number | null>(null);

  const attachedProviders = new Set((projectCredentials ?? []).map((c) => c.provider));
  const attachedCredentialIds = new Set((projectCredentials ?? []).map((c) => c.provider_credential_id));
  const attachedModelIds = new Set((projectModels ?? []).map((m) => m.provider_model_id));

  const availableCredentials = allCredentials.filter((c) => !attachedCredentialIds.has(c.id));
  const availableModels = catalog.filter((m) => attachedProviders.has(m.provider) && !attachedModelIds.has(m.id));

  const [credentialToAdd, setCredentialToAdd] = useState("");
  const [modelToAdd, setModelToAdd] = useState("");
  const [credentialError, setCredentialError] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [addingCredential, setAddingCredential] = useState(false);
  const [addingModel, setAddingModel] = useState(false);

  const addCredential = async () => {
    if (!credentialToAdd) return;
    setAddingCredential(true);
    setCredentialError(null);
    try {
      await clientFetch("/api/proxy/project-credentials", {
        method: "POST",
        body: JSON.stringify({ project_id: projectId, provider_credential_id: Number(credentialToAdd) }),
      });
      setCredentialToAdd("");
      mutateCredentials();
    } catch (e) {
      setCredentialError(e instanceof ClientApiError ? e.message : "Failed to attach credential");
    } finally {
      setAddingCredential(false);
    }
  };

  const removeCredential = async (id: number) => {
    await clientFetch(`/api/proxy/project-credentials/${id}?project_id=${projectId}`, { method: "DELETE" });
    mutateCredentials();
    mutateModels();
  };

  const addModel = async () => {
    if (!modelToAdd) return;
    setAddingModel(true);
    setModelError(null);
    try {
      await clientFetch("/api/proxy/project-models", {
        method: "POST",
        body: JSON.stringify({ project_id: projectId, provider_model_id: Number(modelToAdd) }),
      });
      setModelToAdd("");
      mutateModels();
    } catch (e) {
      setModelError(e instanceof ClientApiError ? e.message : "Failed to allow model");
    } finally {
      setAddingModel(false);
    }
  };

  const removeModel = async (id: number) => {
    await clientFetch(`/api/proxy/project-models/${id}?project_id=${projectId}`, { method: "DELETE" });
    mutateModels();
    // Removing a model cascades its fallback rows (as either side of a
    // chain) in the DB — refresh so the UI doesn't show stale references.
    mutateFallbacks();
  };

  const selectClass =
    "flex-1 rounded-[9px] border border-border bg-bg px-3 py-2 text-[12.5px] text-tx outline-none focus:border-accent disabled:opacity-50";
  const addBtnClass =
    "rounded-[9px] border border-border bg-panel2 px-3 py-2 text-[12.5px] font-bold text-tx hover:border-accent disabled:opacity-50";
  const removeBtnClass = "text-[11.5px] font-semibold text-txd hover:text-red";

  return (
    <div className="mb-[18px] grid grid-cols-1 gap-[18px] lg:grid-cols-2">
      <Card className="overflow-hidden">
        <div className="border-b border-border px-[18px] py-3">
          <span className="text-[13px] font-bold">Provider credentials</span>
          <p className="mt-0.5 text-[11.5px] text-txd">At most one credential per provider — resolved at request time.</p>
        </div>
        <div className="px-[18px] py-3">
          {projectCredentials && projectCredentials.length > 0 ? (
            <div className="mb-3 flex flex-col gap-1.5">
              {projectCredentials.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-[8px] border border-border bg-bg px-3 py-2 text-[12.5px]">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: providerColor(c.provider) }} />
                    <span className="capitalize">{c.provider}</span>
                    <span className="text-txd">— {c.credential_name ?? "unnamed"}</span>
                  </span>
                  <button onClick={() => removeCredential(c.id)} className={removeBtnClass}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mb-3 text-[12.5px] text-txd">No credentials attached — this project can&apos;t serve any requests yet.</p>
          )}

          {availableCredentials.length > 0 ? (
            <div className="flex gap-2">
              <select value={credentialToAdd} onChange={(e) => setCredentialToAdd(e.target.value)} className={selectClass}>
                <option value="">Select a credential…</option>
                {availableCredentials.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.provider})
                  </option>
                ))}
              </select>
              <button onClick={addCredential} disabled={!credentialToAdd || addingCredential} className={addBtnClass}>
                {addingCredential ? "…" : "Add"}
              </button>
            </div>
          ) : (
            <p className="text-[11.5px] text-txd">
              {allCredentials.length === 0 ? "No provider credentials exist yet." : "Every provider is already covered."}
            </p>
          )}
          {credentialError && <p className="mt-2 text-[11.5px] font-semibold text-red">{credentialError}</p>}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-border px-[18px] py-3">
          <span className="text-[13px] font-bold">Allowed models</span>
          <p className="mt-0.5 text-[11.5px] text-txd">The only models this project&apos;s keys can call.</p>
        </div>
        <div className="px-[18px] py-3">
          {projectModels && projectModels.length > 0 ? (
            <div className="mb-3 flex flex-col gap-1.5">
              {projectModels.map((m) => {
                const modelChain = (fallbacks ?? [])
                  .filter((f) => f.primary_project_model_id === m.id)
                  .sort((a, b) => a.priority - b.priority);
                const isExpanded = expandedModelId === m.id;
                return (
                  <div key={m.id} className="rounded-[8px] border border-border bg-bg px-3 py-2 text-[12.5px]">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: providerColor(m.provider ?? "") }} />
                        <span className="font-mono font-bold">{m.model_id}</span>
                      </span>
                      <span className="flex items-center gap-3">
                        <button
                          onClick={() => setExpandedModelId(isExpanded ? null : m.id)}
                          className="text-[11.5px] font-semibold text-txd hover:text-tx"
                        >
                          Fallbacks{modelChain.length > 0 ? ` (${modelChain.length})` : ""} {isExpanded ? "▲" : "▼"}
                        </button>
                        <button onClick={() => removeModel(m.id)} className={removeBtnClass}>
                          Remove
                        </button>
                      </span>
                    </div>
                    {isExpanded && (
                      <ModelFallbackChain
                        projectId={projectId}
                        model={m}
                        allModels={projectModels}
                        chain={modelChain}
                        onChanged={() => mutateFallbacks()}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mb-3 text-[12.5px] text-txd">No models allowed yet.</p>
          )}

          {availableModels.length > 0 ? (
            <div className="flex gap-2">
              <select value={modelToAdd} onChange={(e) => setModelToAdd(e.target.value)} className={selectClass}>
                <option value="">Select a model…</option>
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.provider} / {m.model_id}
                  </option>
                ))}
              </select>
              <button onClick={addModel} disabled={!modelToAdd || addingModel} className={addBtnClass}>
                {addingModel ? "…" : "Add"}
              </button>
            </div>
          ) : (
            <p className="text-[11.5px] text-txd">
              {attachedProviders.size === 0
                ? "Attach a provider credential first."
                : "No more catalog models for the attached providers."}
            </p>
          )}
          {modelError && <p className="mt-2 text-[11.5px] font-semibold text-red">{modelError}</p>}
        </div>
      </Card>
    </div>
  );
}
