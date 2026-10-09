import { apiFetch } from "./api";
import { getToken } from "./auth";

export type DisputeResult = "PENDING" | "UPHELD" | "REJECTED";

export type ApiDispute = {
  id: string;
  report_id: string;
  submitted_by: string;
  reason: string;
  result: DisputeResult;
  reviewed_by: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  report_title: string;
};

export async function getMyDisputes(): Promise<{
  status: string;
  disputes: ApiDispute[];
}> {
  return apiFetch("/disputes/mine", {
    token: getToken() ?? undefined,
  });
}

export async function getAllDisputes(): Promise<{
  status: string;
  disputes: ApiDispute[];
}> {
  return apiFetch("/disputes", {
    token: getToken() ?? undefined,
  });
}

export async function getDispute(id: string): Promise<{
  status: string;
  dispute: ApiDispute;
}> {
  return apiFetch(`/disputes/${id}`, {
    token: getToken() ?? undefined,
  });
}

export async function reviewDispute(
  id: string,
  result: DisputeResult,
  review_notes?: string
): Promise<{
  status: string;
  message: string;
  dispute: ApiDispute;
}> {
  return apiFetch(`/disputes/${id}/review`, {
    method: "PATCH",
    token: getToken() ?? undefined,
    body: {
      result,
      review_notes,
    },
  });
}
