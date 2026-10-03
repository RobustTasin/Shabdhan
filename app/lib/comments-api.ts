import { apiFetch } from "./api";
import { getToken } from "./auth";

export type ApiComment = {
  id: string;
  report_id: string;
  user_id: string;
  username: string;
  parent_comment_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
};

export async function getCommentsForReport(
  reportId: string
): Promise<{
  status: string;
  count: number;
  comments: ApiComment[];
}> {
  return apiFetch(`/comments/report/${reportId}`);
}

export async function createComment(input: {
  report_id: string;
  parent_comment_id?: string | null;
  content: string;
}): Promise<{
  status: string;
  message: string;
  comment: ApiComment;
}> {
  return apiFetch("/comments", {
    method: "POST",
    token: getToken() ?? undefined,
    body: input,
  });
}

export async function updateComment(
  id: string,
  content: string
): Promise<{
  status: string;
  message: string;
  comment: ApiComment;
}> {
  return apiFetch(`/comments/${id}`, {
    method: "PATCH",
    token: getToken() ?? undefined,
    body: { content },
  });
}

export async function deleteComment(
  id: string
): Promise<{
  status: string;
  message: string;
}> {
  return apiFetch(`/comments/${id}`, {
    method: "DELETE",
    token: getToken() ?? undefined,
  });
}
