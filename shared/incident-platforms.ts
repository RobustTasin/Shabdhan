export type IncidentType = "ONLINE" | "OFFLINE";

export const INCIDENT_TYPES: IncidentType[] = ["OFFLINE", "ONLINE"];

// Popularity order is tailored to Bangladesh, followed by other commonly used
// messaging, social, publishing, marketplace, and communication services.
export const ONLINE_INCIDENT_PLATFORMS = [
  "Facebook",
  "TikTok",
  "YouTube",
  "WhatsApp",
  "Messenger",
  "Instagram",
  "IMO",
  "Telegram",
  "X (Twitter)",
  "LinkedIn",
  "Snapchat",
  "Likee",
  "Reddit",
  "Discord",
  "Threads",
  "Pinterest",
  "Twitch",
  "Google Search or Maps",
  "Website, blog, or forum",
  "Online marketplace",
  "Email",
  "SMS or phone messaging",
  "Other platform",
] as const;
