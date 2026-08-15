import { redirect } from "next/navigation";
import { apiFetch, classifyApiError } from "@/lib/api";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { LogsScreen } from "@/components/screens/logs/LogsScreen";
import type { Paginated, ProjectOption, ProviderModel, RequestLogRow, VirtualKey } from "@/types/api";

export default async function LogsPage() {
  let initialData: Paginated<RequestLogRow>;
  try {
    initialData = await apiFetch<Paginated<RequestLogRow>>("/api/admin/logs?page=1&limit=50");
  } catch (error) {
    if (classifyApiError(error) === "unauthorized") redirect("/login");
    if (classifyApiError(error) === "forbidden") return <AccessDenied section="request logs" />;
    throw error;
  }

  // Best-effort: these only populate filter dropdowns, they're not required
  // to see the log rows themselves — a user with logs:read but not
  // projects:read/virtual_keys:read/models:read still gets a working page,
  // just with fewer filter options.
  const [projects, virtualKeys, models] = await Promise.all([
    apiFetch<ProjectOption[]>("/api/admin/projects/options").catch(() => []),
    apiFetch<VirtualKey[]>("/api/admin/virtual-keys").catch(() => []),
    apiFetch<ProviderModel[]>("/api/admin/models").catch(() => []),
  ]);

  return <LogsScreen initialData={initialData} projects={projects} virtualKeys={virtualKeys} models={models} />;
}
