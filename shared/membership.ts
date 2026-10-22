export const SUGGESTED_SOCIAL_PLATFORMS = [
  "Facebook",
  "Instagram",
  "X (Twitter)",
  "YouTube",
  "Discord",
  "TikTok",
  "Threads",
  "WhatsApp",
  "Reddit",
  "Slack",
  "Telegram",
  "LinkedIn",
  "Snapchat",
  "Other",
] as const;

export type MembershipApplicationStatus = "PENDING" | "APPROVED" | "DECLINED";

export type MembershipApplication = {
  id: string;
  application_number: string;
  email: string;
  social_platform: string;
  social_url: string;
  status: MembershipApplicationStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by_username: string | null;
  code_expires_at: string | null;
  approval_code: string | null;
  account_created_at: string | null;
};

export function formatMembershipApplicationNumber(value: string | number) {
  return `MEM-${String(value).padStart(5, "0")}`;
}
