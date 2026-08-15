import { redirect } from "next/navigation";
import { apiFetch, classifyApiError } from "@/lib/api";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { Card } from "@/components/ui/Card";
import { NewRoleButton } from "@/components/screens/users-roles/NewRoleButton";
import { NewUserButton } from "@/components/screens/users-roles/NewUserButton";
import { UserRow } from "@/components/screens/users-roles/UserRow";
import { RoleCard } from "@/components/screens/users-roles/RoleCard";
import type { Profile, Role, User } from "@/types/api";

export default async function UsersRolesPage() {
  let users: User[];
  let roles: Role[];
  let allPermissions: string[];
  let me: Profile;
  try {
    [users, roles, allPermissions, me] = await Promise.all([
      apiFetch<User[]>("/api/admin/users"),
      apiFetch<Role[]>("/api/admin/roles"),
      apiFetch<string[]>("/api/admin/permissions"),
      apiFetch<Profile>("/api/admin/auth/me"),
    ]);
  } catch (error) {
    if (classifyApiError(error) === "unauthorized") redirect("/login");
    if (classifyApiError(error) === "forbidden") return <AccessDenied section="users & roles" />;
    throw error;
  }

  const roleUsersByRole = await Promise.all(
    roles.map((r) => apiFetch<{ id: number }[]>(`/api/admin/roles/${r.id}/users`).catch(() => []))
  );
  const roleNamesByUserId = new Map<number, string[]>();
  const roleIdsByUserId = new Map<number, number[]>();
  roles.forEach((role, i) => {
    for (const u of roleUsersByRole[i] ?? []) {
      roleNamesByUserId.set(u.id, [...(roleNamesByUserId.get(u.id) ?? []), role.name]);
      roleIdsByUserId.set(u.id, [...(roleIdsByUserId.get(u.id) ?? []), role.id]);
    }
  });

  return (
    <div>
      <div className="mb-5 flex items-center">
        <div>
          <div className="text-[20px] font-extrabold tracking-tight">Users &amp; roles</div>
          <div className="mt-0.5 text-[13px] text-txm">
            Deny-overrides-grant RBAC. Super admins bypass all permission checks.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[1.6fr_1fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-[18px] py-3">
            <span className="text-[13px] font-bold">Users</span>
            <NewUserButton roles={roles} />
          </div>
          <div className="grid grid-cols-[1.6fr_1.2fr_0.9fr_auto] gap-3 border-b border-border px-[18px] py-2 text-[10.5px] font-bold uppercase tracking-wide text-txd">
            <span>User</span>
            <span>Role</span>
            <span>Status</span>
            <span />
          </div>
          {users.map((u, i) => (
            <UserRow
              key={u.id}
              user={u}
              index={i}
              roleNames={roleNamesByUserId.get(u.id) ?? []}
              roles={roles}
              assignedRoleIds={roleIdsByUserId.get(u.id) ?? []}
              allPermissions={allPermissions}
              currentUserId={me.id}
            />
          ))}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-[18px] py-3">
            <span className="text-[13px] font-bold">Roles</span>
            <NewRoleButton allPermissions={allPermissions} />
          </div>
          {roles.map((r, i) => (
            <RoleCard
              key={r.id}
              role={r}
              allPermissions={allPermissions}
              userCount={(roleUsersByRole[i] ?? []).length}
            />
          ))}
        </Card>
      </div>
    </div>
  );
}
