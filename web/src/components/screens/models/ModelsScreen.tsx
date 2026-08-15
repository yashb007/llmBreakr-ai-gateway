"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card } from "@/components/ui/Card";
import { swrFetcher } from "@/lib/client-fetch";
import { providerColor } from "@/lib/providerColors";
import { EditModelModal } from "./EditModelModal";
import type { ProviderModel } from "@/types/api";

const COLS = "grid-cols-[0.8fr_1.3fr_0.85fr_0.85fr_0.95fr_0.95fr]";

export function ModelsScreen({ initialModels }: { initialModels: ProviderModel[] }) {
  const [editingModel, setEditingModel] = useState<ProviderModel | null>(null);
  const { data: models, mutate } = useSWR<ProviderModel[]>("/api/proxy/models", swrFetcher, {
    fallbackData: initialModels,
  });

  return (
    <div>
      <div className="mb-5">
        <div className="text-[20px] font-extrabold tracking-tight">Model catalog</div>
        <div className="mt-0.5 text-[13px] text-txm">
          Raw provider models, auto-populated when a provider credential is created. Grant a project access to one
          from that project&apos;s detail page.
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className={`grid ${COLS} gap-3 border-b border-border px-[18px] py-2.5 text-[10.5px] font-bold uppercase tracking-wide text-txd`}>
          <span>Provider</span>
          <span>Model id</span>
          <span>Input $/1M</span>
          <span>Output $/1M</span>
          <span>Cache write $/1M</span>
          <span>Cache read $/1M</span>
        </div>
        {models && models.length > 0 ? (
          models.map((m) => (
            <div
              key={m.id}
              onClick={() => setEditingModel(m)}
              className={`grid ${COLS} cursor-pointer items-center gap-3 border-b border-white/4 px-[18px] py-3.5 text-[12.5px] last:border-b-0 hover:bg-white/2`}
            >
              <span className="flex items-center gap-2 capitalize">
                <span className="h-2 w-2 rounded-full" style={{ background: providerColor(m.provider) }} />
                {m.provider}
              </span>
              <span className="font-mono font-bold">{m.model_id}</span>
              <span className="font-mono text-txm">{m.input_price_per_million ?? "—"}</span>
              <span className="font-mono text-txm">{m.output_price_per_million ?? "—"}</span>
              <span className="font-mono text-txm">{m.cache_write_price_per_million ?? "—"}</span>
              <span className="font-mono text-txm">{m.cache_read_price_per_million ?? "—"}</span>
            </div>
          ))
        ) : (
          <p className="px-[18px] py-10 text-center text-sm text-txd">
            No models yet — add a provider credential to populate the catalog.
          </p>
        )}
      </Card>

      {editingModel && (
        <EditModelModal
          open={!!editingModel}
          onClose={() => setEditingModel(null)}
          model={editingModel}
          onSaved={() => mutate()}
          onDeleted={() => mutate()}
        />
      )}
    </div>
  );
}
