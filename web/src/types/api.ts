export interface User {
  id: number;
  email: string;
  name: string;
  is_super_admin: boolean;
  status?: "active" | "disabled";
  last_login_at?: string | null;
}

// Response shape of GET /api/admin/auth/me — the current user plus their own
// roles and effective (role-derived + override-applied) permissions.
export interface Profile extends User {
  roles: { id: number; name: string }[];
  permissions: string[];
}

export interface Project {
  id: number;
  name: string;
  description: string;
  daily_budget_usd: number | null;
  rpm_limit: number | null;
  daily_token_limit: number | null;
  monthly_token_limit: number | null;
  created_by: number | null;
  created_at: string;
}

// Minimal, unscoped shape from /api/admin/projects/options — used to populate
// project pickers (e.g. virtual key creation) without requiring projects:read.
// A full Project satisfies this shape too, so it can be passed interchangeably.
export interface ProjectOption {
  id: number;
  name: string;
}

export interface ProviderCredential {
  id: number;
  provider: string;
  name: string;
  description: string | null;
  created_by: number | null;
  created_at: string;
}

// The catalog of raw models a provider exposes — populated automatically
// when a provider credential is created/synced, one row per (provider, model_id).
export interface ProviderModel {
  id: number;
  provider: string;
  model_id: string;
  // USD per 1M tokens. Null until an admin sets it (no provider exposes
  // pricing via API), in which case that category costs $0. cache_write only
  // applies to Anthropic — OpenAI/Gemini cache reads have no separate write charge.
  input_price_per_million: number | null;
  output_price_per_million: number | null;
  cache_write_price_per_million: number | null;
  cache_read_price_per_million: number | null;
  created_at: string;
}

// A project's credential for one provider (at most one row per provider).
export interface ProjectProviderCredential {
  id: number;
  project_id: number;
  provider_credential_id: number;
  provider: string;
  credential_name: string | null;
  created_by: number | null;
  created_at: string;
}

// A model a project is allowed to call — the sole allowlist at request time.
export interface ProjectModel {
  id: number;
  project_id: number;
  provider_model_id: number;
  provider: string | null;
  model_id: string | null;
  created_by: number | null;
  created_at: string;
}

// One link in a model's fallback chain — when primary_project_model_id
// fails at its provider, chat.service.js tries fallback_project_model_id
// next, in ascending priority order within the same primary.
export interface ProjectModelFallback {
  id: number;
  project_id: number;
  priority: number;
  primary_project_model_id: number;
  primary_model: { provider: string; model_id: string } | null;
  fallback_project_model_id: number;
  fallback_model: { provider: string; model_id: string } | null;
  created_by: number | null;
  created_at: string;
}

export interface VirtualKey {
  id: number;
  project_id: number;
  name: string;
  key_prefix: string;
  rpm_limit: number | null;
  daily_budget_usd: number | null;
  daily_token_limit: number | null;
  monthly_token_limit: number | null;
  expires_at: string | null;
  revoked: boolean;
  approved: boolean;
  approved_by: number | null;
  approved_at: string | null;
  created_by: number | null;
  created_at: string;
}

export interface VirtualKeyWithSecret extends VirtualKey {
  key: string;
}

export interface VirtualKeyTestResult {
  ok: boolean;
  model?: string;
  latency_ms?: number;
  reply?: string | null;
  error?: string;
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  permissions?: string[];
}

export interface RequestLogRow {
  id: number;
  ts: string;
  provider: string | null;
  model: string | null;
  project_id: number | null;
  project_name: string | null;
  virtual_key_id: number | null;
  virtual_key_name: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  cache_write_tokens: number | null;
  cache_read_tokens: number | null;
  latency_ms: number | null;
  status: number | null;
  status_bucket: "2xx" | "4xx" | "5xx" | null;
  cached: boolean;
  blocked_by: string | null;
  error: string | null;
  cost_usd: number;
}

export interface AuditLogRow {
  id: number;
  ts: string;
  actor_id: number | null;
  actor_email: string | null;
  actor_type: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: string | null;
  ip: string | null;
  user_agent: string | null;
  status: string;
}

export interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
}

export interface UsageTotals {
  requests: number;
  errors: number;
  error_rate: number;
  avg_latency_ms: number;
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
}

export interface UsageResponse {
  range: "24h" | "7d" | "30d";
  totals: UsageTotals;
  deltas: {
    requests_pct: number;
    cost_pct: number;
    latency_pct: number;
    error_rate_pct: number;
    input_tokens_pct: number;
    output_tokens_pct: number;
    cached_tokens_pct: number;
  };
  series: {
    bucket: string;
    success: number;
    error: number;
    input_tokens: number;
    output_tokens: number;
    cached_tokens: number;
  }[];
  provider_mix: { provider: string; requests: number; pct: number }[];
}

export interface ApiErrorBody {
  message?: string;
  errors?: unknown;
}
