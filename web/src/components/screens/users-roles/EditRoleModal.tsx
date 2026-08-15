"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { clientFetch } from "@/lib/client-fetch";
import type { Role } from "@/types/api";

export function EditRoleModal({
  open,
  onClose,
  role,
  allPermissions,
}: {
  open: boolean;
  onClose: () => void;
  role: Role;
  allPermissions: string[];
}) {
  const router = useRouter();
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set(role.permissions ?? []));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (permission: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(permission)) next.delete(permission);
      else next.add(permission);
      return next;
    });
  };

  const close = () => {
    setError(null);
    onClose();
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const updates: { name?: string; description?: string } = {};
      if (name !== role.name) updates.name = name;
      if (description !== (role.description ?? "")) updates.description = description;
      if (Object.keys(updates).length > 0) {
        await clientFetch(`/api/proxy/roles/${role.id}`, {
          method: "PATCH",
          body: JSON.stringify(updates),
        });
      }

      await clientFetch(`/api/proxy/roles/${role.id}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ permissions: Array.from(selected) }),
      });

      close();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update role");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={close} width={520}>
      <div className="p-[22px]">
        <div className="mb-1 flex items-center justify-between">
          <div className="text-[17px] font-extrabold tracking-tight">Edit role</div>
          <button onClick={close} className="p-1 text-txd hover:text-tx">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 mt-4">
          <Field label="NAME">
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={role.is_system} />
          </Field>
        </div>
        <div className="mb-4">
          <Field label="DESCRIPTION">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>

        <div className="mb-5">
          <div className="mb-1.5 text-[11.5px] font-bold text-txm">PERMISSIONS</div>
          <div className="grid max-h-64 grid-cols-2 gap-1.5 overflow-y-auto rounded-[9px] border border-border bg-bg p-2.5">
            {allPermissions.map((permission) => (
              <label
                key={permission}
                className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1.5 text-[11.5px] font-mono text-txm hover:bg-white/5"
              >
                <input
                  type="checkbox"
                  checked={selected.has(permission)}
                  onChange={() => toggle(permission)}
                  className="accent-[var(--color-accent)]"
                />
                {permission}
              </label>
            ))}
          </div>
        </div>

        {error && <p className="mb-4 text-[12.5px] font-semibold text-red">{error}</p>}

        <div className="flex justify-end gap-2.5">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!name || submitting}>
            {submitting ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
