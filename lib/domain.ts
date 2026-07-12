// Domain vocabulary (CONTEXT.md) as TypeScript unions + labels.
// These string unions are the app-level enforcement of what the DB stores as String.

export const ROLES = ["ADMIN", "MANAGER", "SALES_REP"] as const;
export type Role = (typeof ROLES)[number];

export const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Non-terminal statuses — a lead here is still being worked. */
export const ACTIVE_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL"] as const;

export const LEAD_SOURCES = ["WEBSITE", "REFERRAL", "WALK_IN", "SOCIAL_MEDIA", "EVENT", "OTHER"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const ACTIVITY_TYPES = ["WHATSAPP_CONTACT", "STATUS_CHANGE", "ASSIGNMENT", "NOTE", "CREATED"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  SALES_REP: "Sales Rep",
};

export const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL: "Proposal",
  WON: "Won",
  LOST: "Lost",
};

export const SOURCE_LABELS: Record<LeadSource, string> = {
  WEBSITE: "Website",
  REFERRAL: "Referral",
  WALK_IN: "Walk-in",
  SOCIAL_MEDIA: "Social media",
  EVENT: "Event",
  OTHER: "Other",
};

export function isLeadStatus(v: string): v is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(v);
}

export function isRole(v: string): v is Role {
  return (ROLES as readonly string[]).includes(v);
}

export function isLeadSource(v: string): v is LeadSource {
  return (LEAD_SOURCES as readonly string[]).includes(v);
}
