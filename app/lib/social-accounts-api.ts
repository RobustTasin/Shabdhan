import { apiFetch } from "./api";
import { getToken } from "./auth";

export type SocialAccount = {
  id: string;
  platform: string;
  username: string;
  profile_url: string | null;
  display_name: string | null;
  account_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function getSocialAccounts() {
  return apiFetch<{
    status: string;
    count: number;
    social_accounts: SocialAccount[];
  }>("/social-accounts", {
    token: getToken() ?? undefined,
  });
}

export async function getSocialAccount(id: string) {
  return apiFetch<{
    status: string;
    social_account: SocialAccount;
  }>(`/social-accounts/${id}`, {
    token: getToken() ?? undefined,
  });
}

export async function createSocialAccount(input: {
  platform: string;
  username: string;
  profile_url?: string;
  display_name?: string;
  account_id?: string;
}) {
  return apiFetch<{
    status: string;
    message: string;
    social_account: SocialAccount;
  }>("/social-accounts", {
    method: "POST",
    token: getToken() ?? undefined,
    body: input,
  });
}

export async function updateSocialAccount(
  id: string,
  input: {
    platform: string;
    username: string;
    profile_url?: string;
    display_name?: string;
    account_id?: string;
  }
) {
  return apiFetch<{
    status: string;
    message: string;
    social_account: SocialAccount;
  }>(`/social-accounts/${id}`, {
    method: "PATCH",
    token: getToken() ?? undefined,
    body: input,
  });
}

export async function deleteSocialAccount(id: string) {
  return apiFetch<{
    status: string;
    message: string;
  }>(`/social-accounts/${id}`, {
    method: "DELETE",
    token: getToken() ?? undefined,
  });
}
