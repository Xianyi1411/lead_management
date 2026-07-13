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

// Temperature is the app's second data-encoding besides stage (DESIGN.md §2):
// burnt orange (hot) → mustard (warm) → slate (cold). Hues are deliberately
// offset from the stage spectrum so a Fit pill never reads as a status pill.
import type { Temperature } from "./scoring";

export const TEMP_UI: Record<Temperature, StatusStyle> = {
  HOT: { label: "Hot", text: "#B0400E", dot: "#E25822", tint: "#FCEAE0" },
  WARM: { label: "Warm", text: "#8A6508", dot: "#C99B0B", tint: "#F9F1D8" },
  COLD: { label: "Cold", text: "#475264", dot: "#94A3B8", tint: "#EEF1F5" },
};
