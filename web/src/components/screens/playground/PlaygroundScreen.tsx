"use client";

import { useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/format";
import { providerColor } from "@/lib/providerColors";
import type { ProviderModel } from "@/types/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  typing?: boolean;
}

async function streamChat({
  virtualKey,
  model,
  temperature,
  messages,
  onDelta,
}: {
  virtualKey: string;
  model: string;
  temperature: number;
  messages: { role: string; content: string }[];
  onDelta: (text: string) => void;
}) {
  const res = await fetch("/api/playground/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ virtualKey, model, temperature, messages, stream_options: { include_usage: true } }),
  });

  if (!res.ok || !res.body) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? "Request failed");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const event of events) {
      const line = event.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) onDelta(delta);
      } catch {
        // partial/malformed JSON at a chunk boundary — ignore, mirrors the
        // gateway's own relayStreamAndCaptureUsage tolerance.
      }
    }
  }
}

export function PlaygroundScreen({ models }: { models: ProviderModel[] }) {
  const [model, setModel] = useState(models[0]?.model_id ?? "");
  const [modelFilter, setModelFilter] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [virtualKey, setVirtualKey] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "user", content: "Say hello in five words." },
    { role: "assistant", content: "Hello there — how are you?" },
  ]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    if (!virtualKey) {
      setError("Paste a virtual key first.");
      return;
    }
    setError(null);

    const history = [...messages, { role: "user" as const, content: text }];
    setMessages([...history, { role: "assistant", content: "", typing: true }]);
    setDraft("");
    setSending(true);

    try {
      await streamChat({
        virtualKey,
        model,
        temperature,
        messages: history,
        onDelta: (delta) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            next[next.length - 1] = { role: "assistant", content: (last?.content ?? "") + delta, typing: true };
            return next;
          });
        },
      });
    } catch (e) {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: e instanceof Error ? `Error: ${e.message}` : "Something went wrong.",
        };
        return next;
      });
    } finally {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last) next[next.length - 1] = { ...last, typing: false };
        return next;
      });
      setSending(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") send();
  };

  const filteredModels = modelFilter.trim()
    ? models.filter((m) => m.model_id.toLowerCase().includes(modelFilter.trim().toLowerCase()))
    : models;

  return (
    <div>
      <div className="mb-5">
        <div className="text-[20px] font-extrabold tracking-tight">Playground</div>
        <div className="mt-0.5 text-[13px] text-txm">
          Send a chat completion through the gateway — OpenAI-compatible, any model allowed for the key&apos;s project.
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[1fr_300px]">
        <div className="flex h-[520px] flex-col overflow-hidden rounded-panel border border-border bg-panel">
          <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-[18px]">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex flex-col gap-1", msg.role === "user" ? "items-end" : "items-start")}>
                <div className={cn("text-[10.5px] font-bold tracking-wide text-txd", msg.role === "assistant" && "font-mono")}>
                  {msg.role === "user" ? "You" : model || "assistant"}
                </div>
                <div
                  className={cn(
                    "max-w-[78%] rounded-[13px] px-3.5 py-2.5 text-[13px] leading-relaxed",
                    msg.role === "user"
                      ? "rounded-br-[4px] bg-accent text-white"
                      : "rounded-bl-[4px] border border-border bg-panel2 text-tx"
                  )}
                >
                  {msg.content}
                  {msg.typing && <span className="animate-caret ml-0.5 inline-block h-3.5 w-1.5 bg-accent align-middle" />}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-end gap-2.5 border-t border-border p-3.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type a message…"
              className="flex-1 rounded-[10px] border border-border bg-bg px-3.5 py-2.5 text-[13px] text-tx outline-none focus:border-accent"
            />
            <button
              onClick={send}
              disabled={sending || !draft.trim()}
              className="whitespace-nowrap rounded-[10px] bg-accent px-4 py-2.5 text-[13px] font-bold text-white hover:brightness-110 disabled:opacity-50"
            >
              {sending ? "…" : "Send"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="rounded-panel border border-border bg-panel p-4">
            <div className="mb-1.5 text-[11.5px] font-bold text-txm">VIRTUAL KEY</div>
            <input
              value={virtualKey}
              onChange={(e) => setVirtualKey(e.target.value)}
              placeholder="vk_…"
              className="w-full rounded-[9px] border border-border bg-bg px-3 py-2 font-mono text-xs text-tx outline-none focus:border-accent"
            />
          </div>

          <div className="rounded-panel border border-border bg-panel p-4">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wide text-txd">Model</span>
              <span className="font-mono text-[10.5px] text-txd">{filteredModels.length}/{models.length}</span>
            </div>
            {models.length > 8 && (
              <input
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                placeholder="Filter models…"
                className="mb-2 w-full rounded-[9px] border border-border bg-bg px-3 py-1.5 text-[12.5px] text-tx outline-none focus:border-accent"
              />
            )}
            <div className="flex max-h-[280px] flex-col gap-1.5 overflow-y-auto pr-0.5">
              {filteredModels.map((m) => {
                const selected = model === m.model_id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setModel(m.model_id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-[9px] border px-2.5 py-2 text-left",
                      selected ? "border-accent bg-accent-soft" : "border-border bg-bg"
                    )}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: providerColor(m.provider) }} />
                    <span className="flex-1 font-mono text-[12.5px]">{m.model_id}</span>
                    {selected && (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                );
              })}
              {models.length === 0 && <p className="text-xs text-txd">No models in the catalog yet.</p>}
              {models.length > 0 && filteredModels.length === 0 && <p className="text-xs text-txd">No models match &quot;{modelFilter}&quot;.</p>}
            </div>
          </div>

          <div className="rounded-panel border border-border bg-panel p-4">
            <div className="mb-2 flex justify-between">
              <span className="text-[12.5px] font-semibold">Temperature</span>
              <span className="font-mono text-[12.5px] font-bold text-accent">{temperature.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </div>

          {error && <p className="text-[12.5px] font-semibold text-red">{error}</p>}
        </div>
      </div>
    </div>
  );
}
