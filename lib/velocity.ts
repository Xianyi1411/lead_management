// Pipeline velocity analytics. Pure and unit-tested — see tests/velocity.test.ts.
//
// Every status change is already an Activity row ("New → Contacted", timestamped),
// so the audit trail doubles as the analytics source: no extra tracking needed.
// This module reconstructs each lead's stage history from those rows and derives:
//
//   - time spent in each stage (where leads get stuck)
//   - stage→stage conversion (where the funnel leaks)
//   - sales-cycle length for won deals (created → Won)
//
// It only depends on plain {detail, createdAt} shapes, never on Prisma types.

import { LeadStatus, STATUS_LABELS } from "./domain";

/** Reverse of STATUS_LABELS: "Contacted" → "CONTACTED". */
const LABEL_TO_STATUS: Record<string, LeadStatus> = Object.fromEntries(
  Object.entries(STATUS_LABELS).map(([status, label]) => [label, status as LeadStatus])
) as Record<string, LeadStatus>;

export interface StatusChangeRow {
  detail: string;
  createdAt: Date;
}

export interface Transition {
  /** null for "Reopened → X" rows (the origin was a terminal status) */
  from: LeadStatus | null;
  to: LeadStatus;
  at: Date;
}

/**
 * Parse a STATUS_CHANGE activity detail. Handles "New → Contacted",
 * "Contacted → Lost · Price too high" (reason suffix), and "Reopened → Proposal".
 * Returns null for anything that isn't a recognisable transition.
 */
export function parseTransition(detail: string, at: Date): Transition | null {
  const head = detail.split("·")[0]; // drop any "· reason" suffix
  const parts = head.split("→").map((s) => s.trim());
  if (parts.length !== 2) return null;
  const to = LABEL_TO_STATUS[parts[1]];
  if (!to) return null;
  const from = parts[0] === "Reopened" ? null : LABEL_TO_STATUS[parts[0]] ?? null;
  return { from, to, at };
}

export interface StageStay {
  status: LeadStatus;
  days: number;
  /** true for the stage the lead is in right now (still accumulating time) */
  ongoing: boolean;
}

export function daysBetween(a: Date, b: Date): number {
  return Math.max(0, (b.getTime() - a.getTime()) / 86_400_000);
}

/**
 * Rebuild the lead's stage history: it starts in NEW at creation, then each
 * parsed transition closes the previous stay. The final stay is ongoing.
 */
export function stageHistory(createdAt: Date, changes: StatusChangeRow[], now: Date): StageStay[] {
  const transitions = changes
    .map((c) => parseTransition(c.detail, c.createdAt))
    .filter((t): t is Transition => t !== null)
    .sort((a, b) => a.at.getTime() - b.at.getTime());

  const stays: StageStay[] = [];
  let current: LeadStatus = "NEW";
  let since = createdAt;
  for (const t of transitions) {
    stays.push({ status: current, days: daysBetween(since, t.at), ongoing: false });
    current = t.to;
    since = t.at;
  }
  stays.push({ status: current, days: daysBetween(since, now), ongoing: true });
  return stays;
}

export interface LeadHistory {
  createdAt: Date;
  changes: StatusChangeRow[];
}

/**
 * Average days leads spend in each stage, across all stays (completed and
 * ongoing — a lead sitting in Proposal for 20 days should show up, not hide
 * until it moves). Stages nothing has reached are absent from the result.
 */
export function avgDaysInStage(
  leads: LeadHistory[],
  now: Date
): Partial<Record<LeadStatus, number>> {
  const total: Partial<Record<LeadStatus, number>> = {};
  const count: Partial<Record<LeadStatus, number>> = {};
  for (const lead of leads) {
    for (const stay of stageHistory(lead.createdAt, lead.changes, now)) {
      total[stay.status] = (total[stay.status] ?? 0) + stay.days;
      count[stay.status] = (count[stay.status] ?? 0) + 1;
    }
  }
  const avg: Partial<Record<LeadStatus, number>> = {};
  for (const status of Object.keys(total) as LeadStatus[]) {
    avg[status] = total[status]! / count[status]!;
  }
  return avg;
}

/** The funnel's forward edges, in order. */
export const FUNNEL_STEPS: [LeadStatus, LeadStatus][] = [
  ["NEW", "CONTACTED"],
  ["CONTACTED", "QUALIFIED"],
  ["QUALIFIED", "PROPOSAL"],
  ["PROPOSAL", "WON"],
];

export interface StepConversion {
  from: LeadStatus;
  to: LeadStatus;
  reached: number;   // leads that ever reached `from`
  advanced: number;  // of those, how many ever reached `to`
  /** advanced / reached, or null when nothing has reached `from` yet */
  rate: number | null;
}

/**
 * Funnel-leak analysis: for each forward step, of the leads that ever reached
 * the stage, what share ever advanced past it? (Leads still sitting in a stage
 * count in the denominator — that's the honest read of where things stall.)
 */
export function stageConversion(leads: LeadHistory[], now: Date): StepConversion[] {
  const reachedSets = leads.map(
    (l) => new Set(stageHistory(l.createdAt, l.changes, now).map((s) => s.status))
  );
  return FUNNEL_STEPS.map(([from, to]) => {
    const reached = reachedSets.filter((set) => set.has(from)).length;
    const advanced = reachedSets.filter((set) => set.has(from) && set.has(to)).length;
    return { from, to, reached, advanced, rate: reached > 0 ? advanced / reached : null };
  });
}

/** When the lead first transitioned to `target`, or null if it never did. */
export function reachedAt(changes: StatusChangeRow[], target: LeadStatus): Date | null {
  const hits = changes
    .map((c) => parseTransition(c.detail, c.createdAt))
    .filter((t): t is Transition => t !== null && t.to === target)
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  return hits[0]?.at ?? null;
}

/**
 * Average days from creation to the Won transition, over leads that won.
 * Null when nothing has been won yet.
 */
export function avgSalesCycleDays(leads: LeadHistory[]): number | null {
  const cycles: number[] = [];
  for (const lead of leads) {
    const won = reachedAt(lead.changes, "WON");
    if (won) cycles.push(daysBetween(lead.createdAt, won));
  }
  if (cycles.length === 0) return null;
  return cycles.reduce((a, b) => a + b, 0) / cycles.length;
}
