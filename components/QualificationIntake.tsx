"use client";

import { useState } from "react";
import {
  BUDGET_STATUSES,
  BUDGET_LABELS,
  AUTHORITY_LEVELS,
  AUTHORITY_LABELS,
  TIMELINES,
  TIMELINE_LABELS,
  isBudgetStatus,
  isAuthority,
  isTimeline,
  isLeadSource,
  type BudgetStatus,
  type Authority,
  type Timeline,
} from "@/lib/domain";
import {
  qualificationScore,
  qualificationVerdict,
  VERDICT_LABELS,
  VERDICT_GUIDANCE,
  type Verdict,
} from "@/lib/scoring";
import Dropdown from "./Dropdown";

const VERDICT_COLOR: Record<Verdict, { bar: string; text: string }> = {
  QUALIFY: { bar: "var(--won)", text: "#0F7147" },
  REVIEW: { bar: "var(--proposal)", text: "#A5680A" },
  NURTURE: { bar: "var(--new)", text: "var(--slate)" },
};

// The qualification gate (ADR-0003): three BANT-style questions scored live with
// source + deal value, so the team sees whether a lead is worth adding BEFORE
// spending calls and follow-ups on it. The score advises; the human decides —
// submitting is never blocked.
export default function QualificationIntake({
  idPrefix,
  source,
  dealValue,
  defaultBudget = "UNKNOWN",
  defaultAuthority = "UNKNOWN",
  defaultTimeline = "UNKNOWN",
}: {
  idPrefix: string;
  source: string;
  dealValue: number;
  defaultBudget?: string;
  defaultAuthority?: string;
  defaultTimeline?: string;
}) {
  const [budget, setBudget] = useState(defaultBudget);
  const [authority, setAuthority] = useState(defaultAuthority);
  const [timeline, setTimeline] = useState(defaultTimeline);

  const input = {
    budgetStatus: isBudgetStatus(budget) ? budget : ("UNKNOWN" as BudgetStatus),
    authority: isAuthority(authority) ? authority : ("UNKNOWN" as Authority),
    timeline: isTimeline(timeline) ? timeline : ("UNKNOWN" as Timeline),
    source: isLeadSource(source) ? source : ("OTHER" as const),
    dealValue: Number.isFinite(dealValue) ? Math.max(0, dealValue) : 0,
  };
  const score = qualificationScore(input);
  const verdict = qualificationVerdict(score);
  const color = VERDICT_COLOR[verdict];

  return (
    <>
      <div className="form-grid">
        <div className="field">
          <label htmlFor={`${idPrefix}-budget`}>Budget</label>
          <Dropdown
            id={`${idPrefix}-budget`}
            name="budgetStatus"
            defaultValue={defaultBudget}
            onChange={setBudget}
            options={BUDGET_STATUSES.map((b) => ({ value: b, label: BUDGET_LABELS[b] }))}
          />
        </div>
        <div className="field">
          <label htmlFor={`${idPrefix}-authority`}>Contact&apos;s role</label>
          <Dropdown
            id={`${idPrefix}-authority`}
            name="authority"
            defaultValue={defaultAuthority}
            onChange={setAuthority}
            options={AUTHORITY_LEVELS.map((a) => ({ value: a, label: AUTHORITY_LABELS[a] }))}
          />
        </div>
        <div className="field full">
          <label htmlFor={`${idPrefix}-timeline`}>Purchase timeline</label>
          <Dropdown
            id={`${idPrefix}-timeline`}
            name="timeline"
            defaultValue={defaultTimeline}
            onChange={setTimeline}
            options={TIMELINES.map((t) => ({ value: t, label: TIMELINE_LABELS[t] }))}
          />
        </div>
      </div>

      <div className="gate" role="status" aria-live="polite">
        <div className="gate-head">
          <span className="gate-lbl">Fit score</span>
          <span className="gate-score tnum">
            {score}
            <small>/100</small>
          </span>
          <b className="gate-verdict" style={{ color: color.text }}>
            {VERDICT_LABELS[verdict]}
          </b>
        </div>
        <div className="gate-meter">
          <i style={{ width: `${score}%`, background: color.bar }} />
        </div>
        <div className="gate-note">{VERDICT_GUIDANCE[verdict]}</div>
      </div>
    </>
  );
}
