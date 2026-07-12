// Status transition rule (Blueprint §9, CONTEXT.md "Transition rule").
// Pure and unit-tested — see tests/transitions.test.ts.
//
//   New       → Contacted, Lost
//   Contacted → Qualified, Lost
//   Qualified → Proposal,  Lost
//   Proposal  → Won,       Lost
//   Won       → (frozen; reopen to Proposal by Manager/Admin only)
//   Lost      → (frozen; reopen to prior status by Manager/Admin only)

import { LeadStatus } from "./domain";

/** One-step-forward map along the funnel. */
const FORWARD: Partial<Record<LeadStatus, LeadStatus>> = {
  NEW: "CONTACTED",
  CONTACTED: "QUALIFIED",
  QUALIFIED: "PROPOSAL",
  PROPOSAL: "WON",
};

/** Won and Lost are terminal — frozen except for a Manager/Admin reopen. */
export function isTerminal(status: LeadStatus): boolean {
  return status === "WON" || status === "LOST";
}

/**
 * Statuses a lead may move to from `from`, following the rule alone (role/ownership
 * are enforced separately in lib/permissions.ts). Terminal statuses return [] here;
 * reopening a terminal lead is a distinct, permission-gated action (see reopenTarget).
 */
export function allowedTransitions(from: LeadStatus): LeadStatus[] {
  if (isTerminal(from)) return [];
  const next: LeadStatus[] = [];
  const forward = FORWARD[from];
  if (forward) next.push(forward);
  next.push("LOST");
  return next;
}

/** True when `to` is a legal next status from `from` under the transition rule. */
export function canTransition(from: LeadStatus, to: LeadStatus): boolean {
  return allowedTransitions(from).includes(to);
}

/**
 * Where a terminal lead returns to when a Manager/Admin reopens it:
 *  - Won  → Proposal (re-enter the active funnel just before the close).
 *  - Lost → its prior active status if known, else Contacted as a safe default.
 * The permission check for reopening lives in lib/permissions.ts (`reopen_lead`).
 */
export function reopenTarget(status: LeadStatus, priorStatus?: LeadStatus): LeadStatus | null {
  if (status === "WON") return "PROPOSAL";
  if (status === "LOST") {
    if (priorStatus && priorStatus !== "LOST" && priorStatus !== "WON") return priorStatus;
    return "CONTACTED";
  }
  return null;
}
