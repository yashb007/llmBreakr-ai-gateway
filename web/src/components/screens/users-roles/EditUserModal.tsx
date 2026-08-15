"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Label } from "@/components/ui/Input";
import { clientFetch } from "@/lib/client-fetch";
import type { Role, User } from "@/types/api";

type Effect = "grant" | "deny";

interface UserPermissions {
  role_permissions: string[];
  overrides: { permission: string; effect: Effect }[];
  effective: string[];
}

export function EditUserModal({
  open,
  onClose,
  user,
  roles,
  assignedRoleIds,
  allPermissions,
  canDelete,
}: {
  open: boolean;
  onClose: () => void;
  user: User;
  roles: Role[];
  assignedRoleIds: number[];
  allPermissions: string[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [password, setPassword] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<Set<number>>(new Set(assignedRoleIds));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [initialOverrides, setInitialOverrides] = useState<Record<string, Effect>>({});
  const [overrides, setOverrides] = useState<Record<string, Effect>>({});
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingPermissions(true);
    clientFetch<UserPermissions>(`/api/proxy/users/${user.id}/permissions`)
      .then((data) => {
        setRolePermissions(data.role_permissions);
        const map: Record<string, Effect> = {};
        for (const o of data.overrides) map[o.permission] = o.effect;
        setInitialOverrides(map);
        setOverrides(map);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load permissions"))
      .finally(() => setLoadingPermissions(false));
  }, [open, user.id]);

  const toggleRole = (roleId: number) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  };

  const setOverride = (permission: string, effect: Effect | null) => {
    setOverrides((prev) => {
      const next = { ...prev };
      if (effect === null) delete next[permission];
      else next[permission] = effect;
      return next;
    });
  };

  const close = () => {
    setPassword("");
    setError(null);
    setConfirmingDelete(false);
    onClose();
  };

  const del = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await clientFetch(`/api/proxy/users/${user.id}`, { method: "DELETE" });
      close();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete user");
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const updates: { name?: string; password?: string } = {};
      if (name !== user.name) updates.name = name;
      if (password) updates.password = password;
      if (Object.keys(updates).length > 0) {
        await clientFetch(`/api/proxy/users/${user.id}`, {
          method: "PATCH",
          body: JSON.stringify(updates),
        });
      }

      const before = new Set(assignedRoleIds);
      const toAssign = Array.from(selectedRoles).filter((id) => !before.has(id));
      const toRevoke = assignedRoleIds.filter((id) => !selectedRoles.has(id));

      const toSetOverride = Object.entries(overrides).filter(
        ([permission, effect]) => initialOverrides[permission] !== effect
      );
      const toRemoveOverride = Object.keys(initialOverrides).filter((permission) => !(permission in overrides));

      await Promise.all([
        ...toAssign.map((roleId) =>
          clientFetch(`/api/proxy/roles/${roleId}/users`, {
            method: "POST",
            body: JSON.stringify({ user_id: user.id }),
          })
        ),
        ...toRevoke.map((roleId) =>
          clientFetch(`/api/proxy/roles/${roleId}/users/${user.id}`, { method: "DELETE" })
        ),
        ...toSetOverride.map(([permission, effect]) =>
          clientFetch(`/api/proxy/users/${user.id}/permissions/${permission}`, {
            method: "PUT",
            body: JSON.stringify({ effect }),
          })
        ),
        ...toRemoveOverride.map((permission) =>
          clientFetch(`/api/proxy/users/${user.id}/permissions/${permission}`, { method: "DELETE" })
        ),
      ]);

      close();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={close} width={540}>
      <div className="p-[22px]">
        <div className="mb-1 flex items-center justify-between">
          <div className="text-[17px] font-extrabold tracking-tight">Edit user</div>
          <button onClick={close} className="p-1 text-txd hover:text-tx">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="mb-4 mt-1 text-[12.5px] text-txm">{user.email}</p>

        <div className="mb-4">
          <Field label="NAME">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </div>
        <div className="mb-4">
          <Field label="NEW PASSWORD">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep unchanged"
            />
          </Field>
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

        <div className="mb-5">
          <Label>PERMISSION OVERRIDES</Label>
          <p className="mb-1.5 text-[11px] text-txd">
            Overrides win over roles: deny removes a role-granted permission, grant adds one beyond their roles.
          </p>
          <div className="max-h-64 overflow-y-auto rounded-[9px] border border-border bg-bg p-2.5">
            {loadingPermissions ? (
              <div className="px-2 py-3 text-[11.5px] text-txd">Loading…</div>
            ) : (
              allPermissions.map((permission) => {
                const fromRole = rolePermissions.includes(permission);
                const effect = overrides[permission] ?? null;
                return (
                  <div
                    key={permission}
                    className="flex items-center justify-between gap-2 rounded-[6px] px-2 py-1.5 text-[11.5px] hover:bg-white/5"
                  >
                    <span className={`truncate font-mono ${fromRole ? "text-txm" : "text-txd"}`}>
                      {permission}
                      {fromRole && <span className="ml-1.5 text-[9.5px] font-sans text-accent2">via role</span>}
                    </span>
                    <div className="flex flex-none gap-1">
                      <button
                        type="button"
                        onClick={() => setOverride(permission, null)}
                        className={`rounded-[5px] px-1.5 py-0.5 text-[10px] font-bold ${
                          effect === null ? "bg-white/10 text-tx" : "text-txd hover:text-txm"
                        }`}
                      >
                        Inherit
                      </button>
                      <button
                        type="button"
                        onClick={() => setOverride(permission, "grant")}
                        className={`rounded-[5px] px-1.5 py-0.5 text-[10px] font-bold ${
                          effect === "grant" ? "bg-[rgba(55,214,154,.18)] text-accent2" : "text-txd hover:text-txm"
                        }`}
                      >
                        Grant
                      </button>
                      <button
                        type="button"
                        onClick={() => setOverride(permission, "deny")}
                        className={`rounded-[5px] px-1.5 py-0.5 text-[10px] font-bold ${
                          effect === "deny" ? "bg-[rgba(242,88,95,.18)] text-red" : "text-txd hover:text-txm"
                        }`}
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {error && <p className="mb-4 text-[12.5px] font-semibold text-red">{error}</p>}

        <div className="flex items-center justify-between gap-2.5">
          <button
            onClick={del}
            disabled={deleting || !canDelete}
            title={canDelete ? undefined : "You can't delete your own account"}
            className="rounded-[10px] border border-border bg-panel2 px-3 py-2.5 text-[12.5px] font-bold text-red hover:border-red disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? "Deleting…" : confirmingDelete ? "Click again to confirm" : "Delete user"}
          </button>
          <div className="flex gap-2.5">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!name || (!!password && password.length < 8) || submitting}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
