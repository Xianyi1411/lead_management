// Presentation mapping for the pipeline spectrum (DESIGN.md §2). Single source so the
// status pill, dashboard funnel, and detail stepper never drift apart.

import { LeadStatus } from "./domain";

export interface StatusStyle {
  label: string;
  /** darkened text colour for pills (AA on the tint) */
  text: string;
  /** saturated colour for dot / funnel segment / stepper node */
  dot: string;
  /** pale pill background */
  tint: string;
}

export const STATUS_UI: Record<LeadStatus, StatusStyle> = {
  NEW: { label: "New", text: "#475264", dot: "#64748B", tint: "#EEF1F5" },
  CONTACTED: { label: "Contacted", text: "#1D54C4", dot: "#2F6FED", tint: "#E9F0FE" },
  QUALIFIED: { label: "Qualified", text: "#0B7580", dot: "#0E9AA7", tint: "#E2F4F5" },
  PROPOSAL: { label: "Proposal", text: "#A5680A", dot: "#D98A0B", tint: "#FBF0DC" },
  WON: { label: "Won", text: "#0F7147", dot: "#17915B", tint: "#E4F3EA" },
  LOST: { label: "Lost", text: "#B23A34", dot: "#D2453E", tint: "#FBE9E8" },
};

/** Funnel order (Won/Lost live at the end; Lost is the off-ramp). */
export const FUNNEL_ORDER: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "WON",
  "LOST",
];
