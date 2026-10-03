import { apiFetch } from "./api";
import { getToken } from "./auth";

export type ReportStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "UNDER_REVIEW"
  | "RESOLVED"
  | "REJECTED";

export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

export type Category = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

export type SocialAccount = {
  id: string;
  platform: string;
  username: string;
  profile_url: string | null;
  display_name: string | null;
  account_id: string | null;
};

export type ApiReport = {
  id: string;
  reporter_id: string;
  social_account_id: string;
  category_id: string | null;
  title: string;
  description: string;
  status: ReportStatus;
  verification_status: VerificationStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  social_account?: SocialAccount;
  category?: Category | null;
};

export type ReportListResponse = {
  status: string;
  reports: ApiReport[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

export async function getReports(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: ReportStatus;
} = {}): Promise<ReportListResponse> {
  const query = new URLSearchParams();

  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);

  const suffix = query.toString() ? `?${query.toString()}` : "";

  return apiFetch<ReportListResponse>(`/reports${suffix}`, {
    token: getToken() ?? undefined,
  });
}

export async function getReport(id: string): Promise<{
  status: string;
  report: ApiReport;
}> {
  return apiFetch(`/reports/${id}`);
}

export async function createReport(input: {
  social_account_id: string;
  category_id?: string | null;
  title: string;
  description: string;
}): Promise<{ status: string; report: ApiReport }> {
  return apiFetch("/reports", {
    method: "POST",
    token: getToken() ?? undefined,
    body: JSON.stringify(input),
  });
}

export async function getCategories(): Promise<{
  status: string;
  categories: Category[];
}> {
  return apiFetch("/categories");
}

export async function getSocialAccounts(): Promise<{
  status: string;
  social_accounts: SocialAccount[];
}> {
  return apiFetch("/social-accounts", {
    token: getToken() ?? undefined,
  });
}

export async function createSocialAccount(input: {
  platform: string;
  username: string;
  profile_url?: string;
  display_name?: string;
  account_id?: string;
}): Promise<{ status: string; social_account: SocialAccount }> {
  return apiFetch("/social-accounts", {
    method: "POST",
    token: getToken() ?? undefined,
    body: JSON.stringify(input),
  });
}

export function reportStatusLabel(
  status: ReportStatus,
  verificationStatus: VerificationStatus
): string {
  if (verificationStatus === "VERIFIED") return "Verified";
  if (status === "UNDER_REVIEW") return "Under review";
  if (status === "REJECTED") return "Rejected";
  if (status === "RESOLVED") return "Resolved";
  if (status === "PUBLISHED") return "Published";
  return "Draft";
}
