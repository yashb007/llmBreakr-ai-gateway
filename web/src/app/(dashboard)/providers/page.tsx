import { redirect } from "next/navigation";
import { apiFetch, classifyApiError } from "@/lib/api";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { ProvidersScreen } from "@/components/screens/providers/ProvidersScreen";
import type { ProviderCredential } from "@/types/api";

export default async function ProvidersPage() {
  let credentials: ProviderCredential[];
  try {
    credentials = await apiFetch<ProviderCredential[]>("/api/admin/provider-creds");
  } catch (error) {
    if (classifyApiError(error) === "unauthorized") redirect("/login");
    if (classifyApiError(error) === "forbidden") return <AccessDenied section="provider credentials" />;
    throw error;
  }

  return <ProvidersScreen initialCredentials={credentials} />;
}
