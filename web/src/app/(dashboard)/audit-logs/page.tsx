import { redirect } from "next/navigation";
import { apiFetch, classifyApiError } from "@/lib/api";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { AuditLogsScreen } from "@/components/screens/audit-logs/AuditLogsScreen";
import type { AuditLogRow, Paginated } from "@/types/api";

export default async function AuditLogsPage() {
  let initialData: Paginated<AuditLogRow>;
  try {
    initialData = await apiFetch<Paginated<AuditLogRow>>("/api/admin/audit-logs?page=1&limit=50");
  } catch (error) {
    if (classifyApiError(error) === "unauthorized") redirect("/login");
    if (classifyApiError(error) === "forbidden") return <AccessDenied section="audit logs" />;
    throw error;
  }

  return <AuditLogsScreen initialData={initialData} />;
}
