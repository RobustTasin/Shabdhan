import { apiFetch } from "./api";
import { getToken, type UserRole } from "./auth";
import type { ApiReport } from "./reports-api";

export type PublicProfile = {
  id: string;
  username: string;
  stats: {
    reports: number;
    disputes: number;
    published: number;
    declined: number;
    evidences: number;
  };
  reports: Array<Pick<ApiReport, "id" | "title" | "public_report_number" | "public_report_category_code" | "published_at" | "created_at"> & {
    category_name: string | null;
    platform: string;
    social_account_username: string;
  }>;
};

export async function getPublicProfile(id: string) {
  return apiFetch<{ status: string; profile: PublicProfile }>(
    `/users/${encodeURIComponent(id)}/profile`
  );
}

export type ApiUser = {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
};

export async function getUsers() {
  return apiFetch<{
    status: string;
    count: number;
    users: ApiUser[];
  }>("/users", {
    token: getToken() ?? undefined,
  });
}

export async function getUser(id: string) {
  return apiFetch<{
    status: string;
    user: ApiUser;
  }>(`/users/${id}`, {
    token: getToken() ?? undefined,
  });
}

export async function updateUser(
  id: string,
  input: {
    username: string;
    email: string;
  }
) {
  return apiFetch<{
    status: string;
    message: string;
    user: ApiUser;
  }>(`/users/${id}`, {
    method: "PATCH",
    token: getToken() ?? undefined,
    body: input,
  });
}

export async function updateUserRole(
  id: string,
  role: UserRole
) {
  return apiFetch<{
    status: string;
    message: string;
    user: ApiUser;
  }>(`/users/${id}/role`, {
    method: "PATCH",
    token: getToken() ?? undefined,
    body: { role },
  });
}

export async function updateUserStatus(
  id: string,
  is_active: boolean
) {
  return apiFetch<{
    status: string;
    message: string;
    user: ApiUser;
  }>(`/users/${id}/status`, {
    method: "PATCH",
    token: getToken() ?? undefined,
    body: { is_active },
  });
}
