import { redirect } from "next/navigation";
import { apiFetch, classifyApiError } from "@/lib/api";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import type { User } from "@/types/api";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let user: User;
  try {
    user = await apiFetch<User>("/api/admin/auth/me");
  } catch (error) {
    if (classifyApiError(error) === "unauthorized") redirect("/login");
    throw error;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar user={user} />
        <div className="flex-1 overflow-y-auto p-[26px]">
          <div className="animate-floatup mx-auto max-w-[1320px]">{children}</div>
        </div>
      </main>
    </div>
  );
}
