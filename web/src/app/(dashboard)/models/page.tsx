import { redirect } from "next/navigation";
import { apiFetch, classifyApiError } from "@/lib/api";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { ModelsScreen } from "@/components/screens/models/ModelsScreen";
import type { ProviderModel } from "@/types/api";

export default async function ModelsPage() {
  let models: ProviderModel[];
  try {
    models = await apiFetch<ProviderModel[]>("/api/admin/models");
  } catch (error) {
    if (classifyApiError(error) === "unauthorized") redirect("/login");
    if (classifyApiError(error) === "forbidden") return <AccessDenied section="the model registry" />;
    throw error;
  }

  return <ModelsScreen initialModels={models} />;
}
