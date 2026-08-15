import { redirect } from "next/navigation";
import { apiFetch, classifyApiError } from "@/lib/api";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { PlaygroundScreen } from "@/components/screens/playground/PlaygroundScreen";
import type { ProviderModel } from "@/types/api";

export default async function PlaygroundPage() {
  let models: ProviderModel[];
  try {
    models = await apiFetch<ProviderModel[]>("/api/admin/models");
  } catch (error) {
    if (classifyApiError(error) === "unauthorized") redirect("/login");
    if (classifyApiError(error) === "forbidden") return <AccessDenied section="the playground" />;
    throw error;
  }

  return <PlaygroundScreen models={models} />;
}
