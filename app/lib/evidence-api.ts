import { apiFetch } from "./api";
import { getToken } from "./auth";

export type EvidenceType =
  | "IMAGE"
  | "VIDEO"
  | "DOCUMENT"
  | "LINK"
  | "OTHER";

export type VerificationStatus =
  | "PENDING"
  | "VERIFIED"
  | "REJECTED";

export type EvidenceUploader = {
  id: string;
  username: string;
};

export type Evidence = {
  id: string;
  report_id: string;
  uploaded_by: string;
  evidence_type: EvidenceType;
  file_name: string | null;
  file_url: string | null;
  file_hash: string | null;
  description: string | null;
  verification_status: VerificationStatus;
  created_at: string;
  updated_at: string;
  uploader?: EvidenceUploader;
};

type EvidenceResponse = {
  status: string;
  evidence: Evidence;
};

type EvidenceListResponse = {
  status: string;
  count: number;
  evidence: Evidence[];
};

export async function getEvidenceForReport(
  reportId: string
): Promise<EvidenceListResponse> {
  return apiFetch<EvidenceListResponse>(
    `/evidence/report/${reportId}`
  );
}

export async function getEvidence(
  id: string
): Promise<EvidenceResponse> {
  return apiFetch<EvidenceResponse>(
    `/evidence/${id}`
  );
}

export async function uploadEvidence(
  reportId: string,
  file: File,
  description?: string
): Promise<EvidenceResponse> {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("report_id", reportId);

  if (description?.trim()) {
    formData.append("description", description.trim());
  }

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("shabdhan-token")
      : null;

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/evidence/upload`,
    {
      method: "POST",
      body: formData,
      cache: "no-store",
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    }
  );

  if (!response.ok) {
    let message = "Failed to upload evidence";

    try {
      const data = await response.json();

      if (data?.message) {
        message = data.message;
      }
    } catch {
      // Ignore invalid error response body.
    }

    throw new Error(message);
  }

  return response.json();
}

export async function createEvidence(data: {
  report_id: string;
  evidence_type: EvidenceType;
  file_name?: string;
  file_url?: string;
  file_hash?: string;
  description?: string;
}): Promise<EvidenceResponse> {
  return apiFetch<EvidenceResponse>("/evidence", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateEvidenceVerification(
  id: string,
  verification_status: VerificationStatus
): Promise<EvidenceResponse> {
  return apiFetch<EvidenceResponse>(
    `/evidence/${id}/verify`,
    {
      method: "PATCH",
      body: JSON.stringify({
        verification_status,
      }),
    }
  );
}

export type UserEvidence = Evidence & {
  report_title: string;
};

type UserEvidenceListResponse = {
  status: string;
  count: number;
  evidence: UserEvidence[];
};

export async function getUserEvidence(): Promise<UserEvidenceListResponse> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("shabdhan-token")
      : null;

  return apiFetch<UserEvidenceListResponse>("/evidence", {
    token: token ?? undefined,
  });
}