import { apiFetch } from "./api";
import { getToken } from "./auth";

export type ApiRiskScore = {
  id: string;
  report_id: string;
  score: number;
  explanation: string;
  calculated_at: string;
};

export async function getRiskScoreForReport(reportId: string) {
  return apiFetch<{
    status: string;
    risk_score: ApiRiskScore;
  }>(`/risk-scores/${reportId}`, {
    token: getToken() ?? undefined,
  });
}

export async function calculateRiskScore(reportId: string) {
  return apiFetch<{
    status: string;
    message: string;
    risk_score: ApiRiskScore;
  }>(`/risk-scores/${reportId}/calculate`, {
    method: "POST",
    token: getToken() ?? undefined,
  });
}
