// Lead scoring rule (ADR-0003). Pure and unit-tested — see tests/scoring.test.ts.
//
// Two layers, both fully explainable (no black box):
//
//  1. FIT SCORE (0–100) — how well the lead matches our ideal customer, from the
//     BANT-style qualification facts captured at intake (budget, authority,
//     timeline) plus source quality and deal size. Shown live in the Add-lead
//     dialog as the qualification gate: it tells the team whether the lead is
//     worth adding BEFORE anyone spends time on calls and follow-ups.
//
//  2. TEMPERATURE (Hot / Warm / Cold) — how urgently a lead should be worked
//     right now: fit score + how deep it already is in the funnel, decayed by
//     inactivity and overdue follow-ups. Drives the "Hottest leads" widget and
//     the Fit column on the leads table.
//
// The weights are deliberate, documented numbers so the rule can be discussed
// and tuned. When enough Won/Lost history exists, the same inputs become the
// feature set for a trained win-prediction model behind this same interface.

import {
  isLeadSource,
  type Authority,
  type BudgetStatus,
  type LeadSource,
  type LeadStatus,
  type Timeline,
} from "./domain";

// --- Fit score (qualification gate) ----------------------------------------

export interface QualificationInput {
  budgetStatus: BudgetStatus;
  authority: Authority;
  timeline: Timeline;
  /** a built-in LeadSource code or a team-added custom source name */
  source: string;
  dealValue: number; // RM
  /** optional exact figures behind the bands (Blueprint §14.8) */
  budgetAmount?: number | null; // the customer's stated budget, RM
  expectedCloseAt?: Date | null; // expected purchase date
  /** reference time for date-derived timeline; defaults to now */
  now?: Date;
}

/** One scored dimension, for the "why this score" breakdown in the UI. */
export interface ScorePart {
  label: string;
  points: number;
  max: number;
}

const BUDGET_POINTS: Record<BudgetStatus, number> = {
  CONFIRMED: 30,
  LIKELY: 20,
  UNKNOWN: 8,
  NONE: 0,
};

/**
 * Budget points, adjusted by the exact amount when the team captured one:
 * a stated budget that covers the deal is worth +5 (capped at 30); one under
 * half the deal is a real risk, −5 (floored at 0). No amount = the band alone.
 */
export function budgetPoints(
  status: BudgetStatus,
  budgetAmount: number | null | undefined,
  dealValue: number
): number {
  const base = BUDGET_POINTS[status];
  if (budgetAmount == null || budgetAmount <= 0 || dealValue <= 0) return base;
  if (budgetAmount >= dealValue) return Math.min(30, base + 5);
  if (budgetAmount < dealValue / 2) return Math.max(0, base - 5);
  return base;
}

/**
 * Timeline band derived from an exact expected purchase date: ≤31 days out
 * (or already past) = IMMEDIATE, ≤92 days = THIS_QUARTER, ≤366 days =
 * THIS_YEAR, further = UNKNOWN (a date over a year away is no near-term
 * timeline). The exact date always beats the hand-picked band.
 */
export function timelineFromDate(expectedCloseAt: Date, now: Date): Timeline {
  const days = (expectedCloseAt.getTime() - now.getTime()) / 86_400_000;
  if (days <= 31) return "IMMEDIATE";
  if (days <= 92) return "THIS_QUARTER";
  if (days <= 366) return "THIS_YEAR";
  return "UNKNOWN";
}

/** The band that actually counts: date-derived when a date exists, else as picked. */
export function effectiveTimeline(
  timeline: Timeline,
  expectedCloseAt: Date | null | undefined,
  now: Date
): Timeline {
  return expectedCloseAt ? timelineFromDate(expectedCloseAt, now) : timeline;
}

const AUTHORITY_POINTS: Record<Authority, number> = {
  DECISION_MAKER: 25,
  INFLUENCER: 15,
  UNKNOWN: 8,
};

const TIMELINE_POINTS: Record<Timeline, number> = {
  IMMEDIATE: 25,
  THIS_QUARTER: 18,
  THIS_YEAR: 10,
  UNKNOWN: 5,
};

/** Referrals and events close best for this team; cold social traffic worst. */
const SOURCE_POINTS: Record<LeadSource, number> = {
  REFERRAL: 10,
  EVENT: 8,
  WALK_IN: 7,
  WEBSITE: 6,
  SOCIAL_MEDIA: 4,
  OTHER: 2,
};

/**
 * Custom (team-added) sources score a neutral 5 until the win/loss report
 * proves the channel one way or the other — then the weight gets tuned here.
 */
export function sourcePoints(source: string): number {
  return isLeadSource(source) ? SOURCE_POINTS[source] : 5;
}

export function dealValuePoints(valueRM: number): number {
  if (valueRM >= 100_000) return 10;
  if (valueRM >= 50_000) return 8;
  if (valueRM >= 20_000) return 6;
  if (valueRM >= 5_000) return 4;
  if (valueRM > 0) return 2;
  return 0;
}

/** The score broken into its five dimensions (sums to qualificationScore). */
export function qualificationParts(input: QualificationInput): ScorePart[] {
  const now = input.now ?? new Date();
  const timeline = effectiveTimeline(input.timeline, input.expectedCloseAt, now);
  return [
    { label: "Budget", points: budgetPoints(input.budgetStatus, input.budgetAmount, input.dealValue), max: 30 },
    { label: "Authority", points: AUTHORITY_POINTS[input.authority], max: 25 },
    { label: "Timeline", points: TIMELINE_POINTS[timeline], max: 25 },
    { label: "Source", points: sourcePoints(input.source), max: 10 },
    { label: "Deal size", points: dealValuePoints(input.dealValue), max: 10 },
  ];
}

/** 0–100 fit score. All five dimensions at max = exactly 100. */
export function qualificationScore(input: QualificationInput): number {
  return qualificationParts(input).reduce((sum, p) => sum + p.points, 0);
}

export type Verdict = "QUALIFY" | "REVIEW" | "NURTURE";

/** The gate: what the score recommends. The human always makes the final call. */
export function qualificationVerdict(score: number): Verdict {
  if (score >= 65) return "QUALIFY";
  if (score >= 40) return "REVIEW";
  return "NURTURE";
}

export const VERDICT_LABELS: Record<Verdict, string> = {
  QUALIFY: "Strong fit",
  REVIEW: "Medium fit",
  NURTURE: "Low fit",
};

export const VERDICT_GUIDANCE: Record<Verdict, string> = {
  QUALIFY: "Worth adding — prioritise the first contact.",
  REVIEW: "Add it, but confirm budget and timeline early before investing time.",
  NURTURE: "Weak fit right now — consider parking it instead of spending calls and follow-ups on it.",
};

// --- Temperature (work-priority signal on active leads) ---------------------

export type Temperature = "HOT" | "WARM" | "COLD";

export interface TemperatureInput {
  /** the lead's fit score (qualificationScore of its current facts) */
  fitScore: number;
  status: LeadStatus;
  /** most recent activity of any kind; null when nothing has ever happened */
  lastActivityAt: Date | null;
  nextFollowUpAt: Date | null;
  now: Date;
}

/** Deeper in the funnel = closer to money = hotter. */
const STAGE_BONUS: Partial<Record<LeadStatus, number>> = {
  NEW: 0,
  CONTACTED: 5,
  QUALIFIED: 10,
  PROPOSAL: 15,
};

/** Untouched leads cool down: ≤2d fresh, then −5 / −15 / −25 as they idle. */
export function recencyPenalty(lastActivityAt: Date | null, now: Date): number {
  if (!lastActivityAt) return -25;
  const days = (now.getTime() - lastActivityAt.getTime()) / 86_400_000;
  if (days <= 2) return 0;
  if (days <= 7) return -5;
  if (days <= 14) return -15;
  return -25;
}

/**
 * 0–100 work-priority score for an active lead; null for Won/Lost (terminal
 * leads aren't "worked", so they have no temperature).
 */
export function temperatureScore(input: TemperatureInput): number | null {
  const bonus = STAGE_BONUS[input.status];
  if (bonus === undefined) return null; // WON / LOST
  let score = input.fitScore + bonus + recencyPenalty(input.lastActivityAt, input.now);
  if (input.nextFollowUpAt && input.nextFollowUpAt.getTime() < input.now.getTime()) {
    score -= 10; // overdue follow-up — the lead is cooling while we're late
  }
  return Math.max(0, Math.min(100, score));
}

export function temperature(score: number): Temperature {
  if (score >= 70) return "HOT";
  if (score >= 45) return "WARM";
  return "COLD";
}
