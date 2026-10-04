import { apiFetch } from "./api";
import { getToken } from "./auth";

export type ApiCorroboration = {
  id: string;
  report_id: string;
  user_id: string;
  comment: string | null;
  created_at: string;
  user: {
    id: string;
    username: string;
    is_verified: boolean;
  };
};

export async function getCorroborationsForReport(reportId: string) {
  return apiFetch<{
    status: string;
    count: number;
    corroborations: ApiCorroboration[];
  }>(`/corroborations/report/${reportId}`);
}

export async function createCorroboration(input: {
  report_id: string;
  comment?: string;
}) {
  return apiFetch<{
    status: string;
    message: string;
    corroboration: {
      id: string;
      report_id: string;
      user_id: string;
      comment: string | null;
      created_at: string;
    };
  }>("/corroborations", {
    method: "POST",
    token: getToken() ?? undefined,
    body: input,
  });
}

export async function deleteCorroboration(id: string) {
  return apiFetch<{
    status: string;
    message: string;
  }>(`/corroborations/${id}`, {
    method: "DELETE",
    token: getToken() ?? undefined,
  });
}
