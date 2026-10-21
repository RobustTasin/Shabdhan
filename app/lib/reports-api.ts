import { apiFetch } from "./api";
import { getToken } from "./auth";
import { type IncidentType } from "../../shared/incident-platforms";

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
  report_count?: number;
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
  public_report_number: string;
  public_report_category_code: string;
  reporter_id: string;
  social_account_id: string | null;
  category_id: string | null;
  incident_type: IncidentType;
  incident_platform: string | null;
  title: string;
  description: string;
  status: ReportStatus;
  verification_status: VerificationStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  upvote_count?: number;
  downvote_count?: number;
  current_user_vote?: 1 | -1 | null;
  preview_image_url?: string | null;
  verified_evidence_count?: number;
  reporter?: {
    id: string;
    username: string;
  };
  social_account?: SocialAccount | null;
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

export type PublicReportStatus = {
  total: number;
  under_review: number;
  published: number;
  resolved: number;
  declined: number;
};

export async function getPublicReportStatus(): Promise<PublicReportStatus> {
  const response = await apiFetch<{ status: string; counts: PublicReportStatus }>(
    "/reports/public-status"
  );
  return response.counts;
}

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

export type ModerationReportListResponse = {
  status: string;
  reports: (ApiReport & {
    reporter: { id: string; username: string };
  })[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  count: number;
};

export async function getModerationReports(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: ReportStatus;
  verification_status?: VerificationStatus;
  social_account_id?: string;
} = {}): Promise<ModerationReportListResponse> {
  const query = new URLSearchParams();

  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  if (params.verification_status) {
    query.set("verification_status", params.verification_status);
  }
  if (params.social_account_id) {
    query.set("social_account_id", params.social_account_id);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";

  return apiFetch<ModerationReportListResponse>(`/reports/moderation${suffix}`, {
    token: getToken() ?? undefined,
  });
}

export async function searchReports(params: {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  platform?: string;
  socialAccountId?: string;
} = {}): Promise<ReportListResponse> {
  const query = new URLSearchParams();

  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.categoryId) query.set("category_id", params.categoryId);
  if (params.platform) query.set("platform", params.platform);
  if (params.socialAccountId) query.set("social_account_id", params.socialAccountId);

  const suffix = query.toString() ? `?${query.toString()}` : "";

  return apiFetch<ReportListResponse>(`/reports/search${suffix}`, {
    token: getToken() ?? undefined,
  });
}

export async function setReportVote(
  id: string,
  vote: 1 | -1 | null
): Promise<{
  status: string;
  vote: 1 | -1 | null;
  upvote_count: number;
  downvote_count: number;
}> {
  return apiFetch(`/reports/${encodeURIComponent(id)}/vote`, {
    method: "PUT",
    token: getToken() ?? undefined,
    body: JSON.stringify({ vote }),
  });
}

export async function getReport(id: string): Promise<{
  status: string;
  report: ApiReport;
}> {
  return apiFetch(`/reports/${id}`, {
    token: getToken() ?? undefined,
  });
}

export async function editReport(
  id: string,
  input: { title: string; description: string }
): Promise<{ status: string; message: string; report: ApiReport }> {
  return apiFetch(`/reports/${encodeURIComponent(id)}`, {
    method: "PATCH",
    token: getToken() ?? undefined,
    body: input,
  });
}

export async function createReport(input: {
  social_account_id?: string | null;
  category_id?: string | null;
  incident_type: IncidentType;
  incident_platform?: string | null;
  title: string;
  description: string;
}): Promise<{ status: string; report: ApiReport }> {
  return apiFetch("/reports", {
    method: "POST",
    token: getToken() ?? undefined,
    body: JSON.stringify(input),
  });
}

export async function updateReportVerification(
  id: string,
  verification_status: VerificationStatus,
  reason?: string
): Promise<{ status: string; report: ApiReport }> {
  return apiFetch(`/reports/${id}/verify`, {
    method: "PATCH",
    token: getToken() ?? undefined,
    body: JSON.stringify({ verification_status, ...(reason ? { reason } : {}) }),
  });
}

export async function unpublishReport(
  id: string,
  reason?: string
): Promise<{ status: string; report: ApiReport }> {
  return apiFetch(`/reports/${id}/unpublish`, {
    method: "PATCH",
    token: getToken() ?? undefined,
    body: JSON.stringify({ reason }),
  });
}

export async function deleteReport(id: string): Promise<{ status: string; message: string }> {
  return apiFetch(`/reports/${id}`, {
    method: "DELETE",
    token: getToken() ?? undefined,
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
  if (verificationStatus === "REJECTED") return "Verification rejected";
  if (status === "REJECTED") return "Rejected";
  if (status === "UNDER_REVIEW") return "Under review";
  if (status === "RESOLVED") return "Resolved";
  if (status === "PUBLISHED") {
    return verificationStatus === "VERIFIED" ? "Published" : "Awaiting verification";
  }
  if (verificationStatus === "VERIFIED") return "Verified - awaiting publication";
  return "Draft";
}
