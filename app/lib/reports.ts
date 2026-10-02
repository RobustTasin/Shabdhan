export type ReportStatus =
  | "Draft"
  | "Under review"
  | "Verified"
  | "Disputed";

export type Report = {
  id: number;
  title: string;
  category: string;
  status: ReportStatus;
  updated: string;
};

export type Dispute = {
  id: number;
  reportId: number;
  reportTitle: string;
  reason: string;
  createdAt: string;
  status: "Open" | "Resolved";
};

export type EvidenceFile = {
  id: number;
  reportId: number;
  reportTitle: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
};

const REPORTS_STORAGE_KEY = "shabdhan-reports";
const DISPUTES_STORAGE_KEY = "shabdhan-disputes";
const EVIDENCE_STORAGE_KEY = "shabdhan-evidence";

export const defaultReports: Report[] = [
  {
    id: 1,
    title: "Sample verification report",
    category: "General",
    status: "Under review",
    updated: "Today",
  },
];

export const defaultDisputes: Dispute[] = [];

export const defaultEvidence: EvidenceFile[] = [];

export function getReports(): Report[] {
  if (typeof window === "undefined") {
    return defaultReports;
  }

  const stored = localStorage.getItem(REPORTS_STORAGE_KEY);

  if (!stored) {
    localStorage.setItem(
      REPORTS_STORAGE_KEY,
      JSON.stringify(defaultReports)
    );

    return defaultReports;
  }

  try {
    return JSON.parse(stored);
  } catch {
    return defaultReports;
  }
}

export function saveReports(reports: Report[]) {
  localStorage.setItem(
    REPORTS_STORAGE_KEY,
    JSON.stringify(reports)
  );
}

export function getDisputes(): Dispute[] {
  if (typeof window === "undefined") {
    return defaultDisputes;
  }

  const stored = localStorage.getItem(DISPUTES_STORAGE_KEY);

  if (!stored) {
    localStorage.setItem(
      DISPUTES_STORAGE_KEY,
      JSON.stringify(defaultDisputes)
    );

    return defaultDisputes;
  }

  try {
    return JSON.parse(stored);
  } catch {
    return defaultDisputes;
  }
}

export function saveDisputes(disputes: Dispute[]) {
  localStorage.setItem(
    DISPUTES_STORAGE_KEY,
    JSON.stringify(disputes)
  );
}

export function getEvidence(): EvidenceFile[] {
  if (typeof window === "undefined") {
    return defaultEvidence;
  }

  const stored = localStorage.getItem(EVIDENCE_STORAGE_KEY);

  if (!stored) {
    localStorage.setItem(
      EVIDENCE_STORAGE_KEY,
      JSON.stringify(defaultEvidence)
    );

    return defaultEvidence;
  }

  try {
    return JSON.parse(stored);
  } catch {
    return defaultEvidence;
  }
}

export function saveEvidence(evidence: EvidenceFile[]) {
  localStorage.setItem(
    EVIDENCE_STORAGE_KEY,
    JSON.stringify(evidence)
  );
}
