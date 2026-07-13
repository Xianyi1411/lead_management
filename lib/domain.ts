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

export const ACTIVITY_TYPES = ["WHATSAPP_CONTACT", "STATUS_CHANGE", "ASSIGNMENT", "NOTE", "CREATED", "FOLLOW_UP"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

// --- Qualification vocabulary (BANT-style intake, ADR-0003) ---------------

export const BUDGET_STATUSES = ["CONFIRMED", "LIKELY", "UNKNOWN", "NONE"] as const;
export type BudgetStatus = (typeof BUDGET_STATUSES)[number];

export const AUTHORITY_LEVELS = ["DECISION_MAKER", "INFLUENCER", "UNKNOWN"] as const;
export type Authority = (typeof AUTHORITY_LEVELS)[number];

export const TIMELINES = ["IMMEDIATE", "THIS_QUARTER", "THIS_YEAR", "UNKNOWN"] as const;
export type Timeline = (typeof TIMELINES)[number];

export const LOST_REASONS = ["PRICE", "COMPETITOR", "NO_RESPONSE", "NOT_INTERESTED", "BAD_FIT", "OTHER"] as const;
export type LostReason = (typeof LOST_REASONS)[number];

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

export const BUDGET_LABELS: Record<BudgetStatus, string> = {
  CONFIRMED: "Budget confirmed",
  LIKELY: "Budget likely",
  UNKNOWN: "Not sure yet",
  NONE: "No budget",
};

export const AUTHORITY_LABELS: Record<Authority, string> = {
  DECISION_MAKER: "Decision maker",
  INFLUENCER: "Influencer",
  UNKNOWN: "Not sure yet",
};

export const TIMELINE_LABELS: Record<Timeline, string> = {
  IMMEDIATE: "Within a month",
  THIS_QUARTER: "This quarter",
  THIS_YEAR: "This year",
  UNKNOWN: "No timeline yet",
};

export const LOST_REASON_LABELS: Record<LostReason, string> = {
  PRICE: "Price too high",
  COMPETITOR: "Chose a competitor",
  NO_RESPONSE: "Went quiet",
  NOT_INTERESTED: "Not interested",
  BAD_FIT: "Bad fit",
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

export function isBudgetStatus(v: string): v is BudgetStatus {
  return (BUDGET_STATUSES as readonly string[]).includes(v);
}

export function isAuthority(v: string): v is Authority {
  return (AUTHORITY_LEVELS as readonly string[]).includes(v);
}

export function isTimeline(v: string): v is Timeline {
  return (TIMELINES as readonly string[]).includes(v);
}

export function isLostReason(v: string): v is LostReason {
  return (LOST_REASONS as readonly string[]).includes(v);
}
