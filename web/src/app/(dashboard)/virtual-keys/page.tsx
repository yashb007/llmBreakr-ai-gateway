import { redirect } from "next/navigation";
import { apiFetch, classifyApiError } from "@/lib/api";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { VirtualKeysScreen } from "@/components/screens/virtual-keys/VirtualKeysScreen";
import type { ProjectOption, VirtualKey } from "@/types/api";

export default async function VirtualKeysPage() {
  let keys: VirtualKey[];
  let projects: ProjectOption[];
  try {
    // Project *options* (id/name only, unscoped, no projects:read required) —
    // not the full /api/admin/projects list, so a user with only virtual-key
    // permissions can still see project names and create a key under any of
    // them, even if they can't otherwise view full project details.
    [keys, projects] = await Promise.all([
      apiFetch<VirtualKey[]>("/api/admin/virtual-keys"),
      apiFetch<ProjectOption[]>("/api/admin/projects/options"),
    ]);
  } catch (error) {
    if (classifyApiError(error) === "unauthorized") redirect("/login");
    if (classifyApiError(error) === "forbidden") return <AccessDenied section="virtual keys" />;
    throw error;
  }

  return <VirtualKeysScreen initialKeys={keys} projects={projects} />;
}
