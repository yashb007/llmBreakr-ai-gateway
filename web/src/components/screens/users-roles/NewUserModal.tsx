"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Label } from "@/components/ui/Input";
import { clientFetch } from "@/lib/client-fetch";
import type { Role, User } from "@/types/api";

export function NewUserModal({
  open,
  onClose,
  roles,
}: {
  open: boolean;
  onClose: () => void;
  roles: Role[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleRole = (roleId: number) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  };

  const close = () => {
    setEmail("");
    setName("");
    setPassword("");
    setIsSuperAdmin(false);
    setSelectedRoles(new Set());
    setError(null);
    onClose();
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const user = await clientFetch<User>("/api/proxy/users", {
        method: "POST",
        body: JSON.stringify({ email, name, password, is_super_admin: isSuperAdmin }),
      });

      await Promise.all(
        Array.from(selectedRoles).map((roleId) =>
          clientFetch(`/api/proxy/roles/${roleId}/users`, {
            method: "POST",
            body: JSON.stringify({ user_id: user.id }),
          })
        )
      );

      close();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={close} width={480}>
      <div className="p-[22px]">
        <div className="mb-1 flex items-center justify-between">
          <div className="text-[17px] font-extrabold tracking-tight">New user</div>
          <button onClick={close} className="p-1 text-txd hover:text-tx">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 mt-4">
          <Field label="NAME">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jane Doe" />
          </Field>
        </div>
        <div className="mb-4">
          <Field label="EMAIL">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@company.com"
            />
          </Field>
        </div>
        <div className="mb-4">
          <Field label="PASSWORD">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </Field>
        </div>

        <div className="mb-4">
          <label className="flex cursor-pointer items-center gap-2 text-[12.5px] font-semibold text-txm">
            <input
              type="checkbox"
              checked={isSuperAdmin}
              onChange={(e) => setIsSuperAdmin(e.target.checked)}
              className="accent-[var(--color-accent)]"
            />
            Super admin (bypasses all permission checks)
          </label>
        </div>

        {roles.length > 0 && (
          <div className="mb-5">
            <Label>ROLES</Label>
            <div className="grid max-h-40 grid-cols-2 gap-1.5 overflow-y-auto rounded-[9px] border border-border bg-bg p-2.5">
              {roles.map((role) => (
                <label
                  key={role.id}
                  className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1.5 text-[11.5px] font-semibold text-txm hover:bg-white/5"
                >
                  <input
                    type="checkbox"
                    checked={selectedRoles.has(role.id)}
                    onChange={() => toggleRole(role.id)}
                    className="accent-[var(--color-accent)]"
                  />
                  {role.name}
                </label>
              ))}
            </div>
          </div>
        )}

        {error && <p className="mb-4 text-[12.5px] font-semibold text-red">{error}</p>}

        <div className="flex justify-end gap-2.5">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!name || !email || password.length < 8 || submitting}>
            {submitting ? "Creating…" : "Create user"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
