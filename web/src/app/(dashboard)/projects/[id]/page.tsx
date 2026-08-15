import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { apiFetch, ApiError, classifyApiError } from "@/lib/api";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { Card } from "@/components/ui/Card";
import { KpiCard } from "@/components/screens/overview/KpiCard";
import { RangeSwitch } from "@/components/screens/overview/RangeSwitch";
import { ProjectKeysScreen } from "@/components/screens/projects/ProjectKeysScreen";
import { ProjectHeaderActions } from "@/components/screens/projects/ProjectHeaderActions";
import { ProjectAccessCard } from "@/components/screens/projects/ProjectAccessCard";
import { Donut } from "@/components/charts/Donut";
import { ProjectTrafficCard } from "@/components/screens/projects/ProjectTrafficCard";
import { ProjectTokensCard } from "@/components/screens/projects/ProjectTokensCard";
import { formatCompactNumber, formatLatency, formatUsd } from "@/lib/format";
import { providerColor } from "@/lib/providerColors";
import type { Project, ProviderCredential, ProviderModel, UsageResponse, VirtualKey } from "@/types/api";

const VALID_RANGES = new Set(["24h", "7d", "30d"]);
const RANGE_LABEL: Record<string, string> = { "24h": "24 hours", "7d": "7 days", "30d": "30 days" };

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { id } = await params;
  const { range: rawRange } = await searchParams;
  const range = VALID_RANGES.has(rawRange ?? "") ? rawRange! : "30d";

  let project: Project;
  let virtualKeys: VirtualKey[];
  let usage: UsageResponse;
  try {
    [project, virtualKeys, usage] = await Promise.all([
      apiFetch<Project>(`/api/admin/projects/${id}`),
      apiFetch<VirtualKey[]>("/api/admin/virtual-keys"),
      apiFetch<UsageResponse>(`/api/admin/usage?range=${range}&project_id=${id}`),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    if (classifyApiError(error) === "unauthorized") redirect("/login");
    if (classifyApiError(error) === "forbidden") return <AccessDenied section="projects" />;
    throw error;
  }

  const { totals, deltas, provider_mix } = usage;
  const projectKeys = virtualKeys.filter((k) => k.project_id === project.id);
  // Both best-effort: the credentials/models access editor is a bonus section
  // on top of the project view, not a requirement to see it — a user with
  // projects:read but not provider_keys:read/models:read still gets the rest.
  const [allCredentials, catalog] = await Promise.all([
    apiFetch<ProviderCredential[]>("/api/admin/provider-creds").catch(() => []),
    apiFetch<ProviderModel[]>("/api/admin/models").catch(() => []),
  ]);

  return (
    <div>
      <Link href="/projects" className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-txm hover:text-tx">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Projects
      </Link>

      <div className="mb-5 flex flex-wrap items-center gap-3.5">
        <div className="flex flex-col gap-0.5">
          <div className="text-[22px] font-extrabold tracking-tight">{project.name}</div>
          <div className="text-[13px] text-txm">{project.description}</div>
          <div className="mt-0.5 text-[11.5px] font-semibold text-txd">
            RPM limit: {project.rpm_limit ?? "No limit"} · Daily budget:{" "}
            {project.daily_budget_usd ? `${formatUsd(project.daily_budget_usd)}/day` : "No cap"} · Daily tokens:{" "}
            {project.daily_token_limit ? formatCompactNumber(project.daily_token_limit) : "No limit"} · Monthly tokens:{" "}
            {project.monthly_token_limit ? formatCompactNumber(project.monthly_token_limit) : "No limit"}
          </div>
        </div>
        <div className="flex-1" />
        <ProjectHeaderActions project={project} />
        <RangeSwitch active={range} basePath={`/projects/${project.id}`} />
      </div>

      <div className="mb-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Spend"
          value={formatUsd(totals.cost_usd)}
          sub={`estimated USD, ${RANGE_LABEL[range]}`}
          deltaPct={deltas.cost_pct}
        />
        <KpiCard
          label="Requests"
          value={formatCompactNumber(totals.requests)}
          sub={`vs prior ${RANGE_LABEL[range]}`}
          deltaPct={deltas.requests_pct}
        />
        <KpiCard
          label="Avg latency"
          value={formatLatency(totals.avg_latency_ms)}
          sub="across all models"
          deltaPct={deltas.latency_pct}
          goodDirection="down"
        />
        <KpiCard
          label="Error rate"
          value={`${(totals.error_rate * 100).toFixed(1)}%`}
          sub={`${totals.errors.toLocaleString()} of ${totals.requests.toLocaleString()}`}
          deltaPct={deltas.error_rate_pct}
          goodDirection="down"
        />
      </div>

      <div className="mb-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-3">
        <KpiCard
          label="Input tokens"
          value={formatCompactNumber(totals.input_tokens)}
          sub={`vs prior ${RANGE_LABEL[range]}`}
          deltaPct={deltas.input_tokens_pct}
        />
        <KpiCard
          label="Output tokens"
          value={formatCompactNumber(totals.output_tokens)}
          sub={`vs prior ${RANGE_LABEL[range]}`}
          deltaPct={deltas.output_tokens_pct}
        />
        <KpiCard
          label="Cached tokens"
          value={formatCompactNumber(totals.cached_tokens)}
          sub={`vs prior ${RANGE_LABEL[range]}`}
          deltaPct={deltas.cached_tokens_pct}
        />
      </div>

      <ProjectTrafficCard projectId={project.id} range={range} virtualKeys={projectKeys} initialUsage={usage} />

      <ProjectTokensCard projectId={project.id} range={range} virtualKeys={projectKeys} initialUsage={usage} />

      <Card className="mb-[18px] p-[18px]">
        <div className="text-sm font-bold">Provider mix</div>
        <div className="text-xs text-txm">Requests routed by upstream</div>
        {provider_mix.length > 0 ? (
          <>
            <div className="my-3.5 flex items-center justify-center">
              <Donut
                values={provider_mix.map((p) => ({ value: p.requests, color: providerColor(p.provider) }))}
                centerLabel={formatCompactNumber(totals.requests)}
                centerSub="requests"
              />
            </div>
            <div className="mt-1 flex flex-col gap-2.5">
              {provider_mix.map((p) => (
                <div key={p.provider} className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: providerColor(p.provider) }} />
                  <span className="flex-1 text-[12.5px] font-semibold capitalize">{p.provider}</span>
                  <span className="font-mono text-xs text-txm">{formatCompactNumber(p.requests)}</span>
                  <span className="w-[42px] text-right font-mono text-xs font-bold">{(p.pct * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="py-14 text-center text-sm text-txd">No traffic yet.</p>
        )}
      </Card>

      <ProjectAccessCard projectId={project.id} allCredentials={allCredentials} catalog={catalog} />

      <ProjectKeysScreen project={project} initialKeys={virtualKeys} />
    </div>
  );
}
