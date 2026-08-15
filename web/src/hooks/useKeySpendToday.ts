import useSWR from "swr";
import { swrFetcher } from "@/lib/client-fetch";
import type { Paginated, RequestLogRow } from "@/types/api";

// Real per-key spend + token usage, computed client-side from today's logs
// (the /usage aggregate endpoint is intentionally global/project-scoped only
// — adding a per-virtual-key aggregate wasn't worth a 3rd backend endpoint
// for this one widget). Capped at the first 200 rows for the day per key:
// fine for a v1 admin panel, but will undercount for an extremely
// high-traffic key.
export function useKeySpendToday(virtualKeyId: number) {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data } = useSWR<Paginated<RequestLogRow>>(
    `/api/proxy/logs?virtual_key_id=${virtualKeyId}&from=${todayStart.toISOString()}&limit=200`,
    swrFetcher
  );

  const rows = data?.data ?? [];
  const spend = rows.reduce((sum, row) => sum + row.cost_usd, 0);
  const inputTokens = rows.reduce((sum, row) => sum + (row.prompt_tokens ?? 0), 0);
  const outputTokens = rows.reduce((sum, row) => sum + (row.completion_tokens ?? 0), 0);
  const cachedTokens = rows.reduce((sum, row) => sum + (row.cache_read_tokens ?? 0), 0);

  return { spend, inputTokens, outputTokens, cachedTokens, loading: !data };
}
