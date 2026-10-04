import { apiFetch } from "./api";
import { getToken } from "./auth";

export type ApiAuditLog = {
  id: string;
  user_id: string | null;
  username: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_data: unknown;
  new_data: unknown;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export async function getAuditLogs(params: {
  page?: number;
  limit?: number;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
} = {}) {
  const searchParams = new URLSearchParams();

  if (params.page) {
    searchParams.set("page", String(params.page));
  }

  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }

  if (params.action) {
    searchParams.set("action", params.action);
  }

  if (params.entity_type) {
    searchParams.set("entity_type", params.entity_type);
  }

  if (params.entity_id) {
    searchParams.set("entity_id", params.entity_id);
  }

  if (params.user_id) {
    searchParams.set("user_id", params.user_id);
  }

  const query = searchParams.toString();

  return apiFetch<{
    status: string;
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    count: number;
    audit_logs: ApiAuditLog[];
  }>(`/audit-logs${query ? `?${query}` : ""}`, {
    token: getToken() ?? undefined,
  });
}
