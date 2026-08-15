import { redirect } from "next/navigation";
import { apiFetch, classifyApiError } from "@/lib/api";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { NewProjectButton } from "@/components/screens/projects/NewProjectButton";
import { ProjectCard } from "@/components/screens/projects/ProjectCard";
import type { Project, ProviderCredential, UsageResponse, VirtualKey } from "@/types/api";

export default async function ProjectsPage() {
  let projects: Project[];
  let virtualKeys: VirtualKey[];
  try {
    [projects, virtualKeys] = await Promise.all([
      apiFetch<Project[]>("/api/admin/projects"),
      apiFetch<VirtualKey[]>("/api/admin/virtual-keys"),
    ]);
  } catch (error) {
    if (classifyApiError(error) === "unauthorized") redirect("/login");
    if (classifyApiError(error) === "forbidden") return <AccessDenied section="projects" />;
    throw error;
  }

  const stats = await Promise.all(
    projects.map((p) =>
      apiFetch<UsageResponse>(`/api/admin/usage?range=30d&project_id=${p.id}`).catch(() => null)
    )
  );

  // Best-effort: letting a new project pick a starting credential is a
  // convenience, not a requirement — a user without provider_keys:read still
  // gets a working create-project flow, just without that shortcut.
  const credentials = await apiFetch<ProviderCredential[]>("/api/admin/provider-creds").catch(() => []);

  return (
    <div>
      <div className="mb-5 flex items-center">
        <div>
          <div className="text-[20px] font-extrabold tracking-tight">Projects</div>
          <div className="mt-0.5 text-[13px] text-txm">
            The grouping and attribution unit every virtual key belongs to.
          </div>
        </div>
        <div className="flex-1" />
        <NewProjectButton credentials={credentials} />
      </div>

      <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2">
        {projects.map((p, i) => (
          <ProjectCard
            key={p.id}
            project={p}
            usage={stats[i] ?? null}
            keyCount={virtualKeys.filter((k) => k.project_id === p.id).length}
          />
        ))}
      </div>
    </div>
  );
}
