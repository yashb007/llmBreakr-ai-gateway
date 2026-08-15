import { redirect } from "next/navigation";
import { apiFetch, classifyApiError } from "@/lib/api";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { ChangePasswordForm } from "@/components/screens/profile/ChangePasswordForm";
import type { Profile } from "@/types/api";

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function ProfilePage() {
  let profile: Profile;
  try {
    profile = await apiFetch<Profile>("/api/admin/auth/me");
  } catch (error) {
    if (classifyApiError(error) === "unauthorized") redirect("/login");
    if (classifyApiError(error) === "forbidden") return <AccessDenied section="profile" />;
    throw error;
  }

  return (
    <div>
      <div className="mb-5">
        <div className="text-[20px] font-extrabold tracking-tight">Profile</div>
        <div className="mt-0.5 text-[13px] text-txm">Your account, roles, permissions, and password.</div>
      </div>

      <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col gap-[18px]">
          <Card className="p-[18px]">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-full bg-gradient-to-br from-[#5b8def] to-accent2 text-[15px] font-bold text-[#08131a]">
                {initialsOf(profile.name) || "?"}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[15px] font-bold">
                  {profile.name}
                  {profile.is_super_admin && (
                    <span className="ml-1.5 rounded-[5px] bg-[rgba(246,182,75,.13)] px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-wide text-amber">
                      SUPER
                    </span>
                  )}
                </div>
                <div className="truncate text-[12.5px] text-txd">{profile.email}</div>
              </div>
            </div>
            <div className="flex flex-col gap-2.5 border-t border-border pt-3.5 text-[12.5px]">
              <div className="flex items-center justify-between">
                <span className="text-txd">Status</span>
                <Pill tone={profile.status === "active" ? "success" : "neutral"}>
                  {profile.status === "active" ? "Active" : "Disabled"}
                </Pill>
              </div>
            </div>
          </Card>

          <Card className="p-[18px]">
            <div className="mb-3 text-[13px] font-bold">Roles</div>
            {profile.is_super_admin ? (
              <p className="text-[12.5px] text-txm">Super admin — bypasses all permission checks.</p>
            ) : profile.roles.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {profile.roles.map((role) => (
                  <Pill key={role.id} tone="accent">
                    {role.name}
                  </Pill>
                ))}
              </div>
            ) : (
              <p className="text-[12.5px] text-txd">No roles assigned.</p>
            )}
          </Card>

          <Card className="p-[18px]">
            <div className="mb-3 text-[13px] font-bold">Permissions</div>
            {profile.permissions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {profile.permissions.map((permission) => (
                  <Pill key={permission} tone="neutral" className="font-mono">
                    {permission}
                  </Pill>
                ))}
              </div>
            ) : (
              <p className="text-[12.5px] text-txd">No permissions granted.</p>
            )}
          </Card>
        </div>

        <Card className="p-[18px]">
          <div className="mb-1 text-[13px] font-bold">Change password</div>
          <p className="mb-4 text-[12.5px] text-txm">
            Changing your password signs you out of every other active session.
          </p>
          <ChangePasswordForm />
        </Card>
      </div>
    </div>
  );
}
