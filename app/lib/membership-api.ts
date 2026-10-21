import { apiFetch } from "./api";
import { getToken } from "./auth";
import type { MembershipApplication, MembershipApplicationStatus } from "../../shared/membership";

export async function submitMembershipApplication(input: { email: string; social_platform: string; social_url: string }) {
  return apiFetch<{ status: string; message: string; application_number: string }>("/membership-applications", { method: "POST", body: input });
}

export async function checkMembershipEligibility(email: string, code: string) {
  return apiFetch<{ status: string; eligible: boolean }>("/membership-applications/eligibility", { method: "POST", body: { email, code } });
}

export async function getMembershipApplications(status: MembershipApplicationStatus | "ALL" = "ALL") {
  return apiFetch<{ status: string; applications: MembershipApplication[] }>(`/membership-applications?status=${status}`, { token: getToken() ?? undefined });
}

async function updateMembershipApplication(id: string, action: "approve" | "decline", code?: string) {
  return apiFetch<{ status: string; message: string }>(`/membership-applications/${encodeURIComponent(id)}/${action}`, { method: "POST", body: code ? { code } : undefined, token: getToken() ?? undefined });
}

export const approveMembershipApplication = (id: string, code: string) => updateMembershipApplication(id, "approve", code);
export const declineMembershipApplication = (id: string) => updateMembershipApplication(id, "decline");

export async function issueMembershipApplicationCode(id: string, code: string) {
  return apiFetch<{ status: string; message: string }>(`/membership-applications/${encodeURIComponent(id)}/code`, { method: "POST", body: { code }, token: getToken() ?? undefined });
}

export async function completeMembership(input: { email: string; code: string; username: string; password: string }) {
  return apiFetch<{ status: string; message: string; user: { id: string; username: string; email: string; role: "USER"; is_verified: boolean }; token: string }>("/auth/complete-membership", { method: "POST", body: input });
}

export type PasswordResetApplication = {
  id: string;
  application_number: string;
  email: string;
  status: "PENDING" | "APPROVED" | "DECLINED" | "COMPLETED";
  created_at: string;
  reviewed_at: string | null;
  code_expires_at: string | null;
  reviewed_by_username: string | null;
  account_exists: boolean;
};

export function requestPasswordReset(email: string) {
  return apiFetch<{ status: string; message: string }>("/password-reset-applications", { method: "POST", body: { email } });
}

export function completeManualPasswordReset(input: { email: string; code: string; password: string }) {
  return apiFetch<{ status: string; message: string }>("/password-reset-applications/complete", { method: "POST", body: input });
}

export function getPasswordResetApplications(status: string) {
  return apiFetch<{ status: string; applications: PasswordResetApplication[] }>(`/password-reset-applications?status=${status}`, { token: getToken() ?? undefined });
}

export function approvePasswordResetApplication(id: string, code: string) {
  return apiFetch<{ status: string; message: string }>(`/password-reset-applications/${encodeURIComponent(id)}/approve`, { method: "POST", body: { code }, token: getToken() ?? undefined });
}

export function declinePasswordResetApplication(id: string) {
  return apiFetch<{ status: string; message: string }>(`/password-reset-applications/${encodeURIComponent(id)}/decline`, { method: "POST", token: getToken() ?? undefined });
}
