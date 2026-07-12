"use client";

import { useState, useTransition } from "react";
import { changeLeadStatus, reopenLead } from "@/app/(app)/leads/actions";
import { STATUS_LABELS, type LeadStatus } from "@/lib/domain";
import { allowedTransitions, isTerminal, reopenTarget } from "@/lib/transitions";

const FUNNEL: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON"];

// Renders the transition rule directly: only legal next moves appear as buttons —
// the illegal jump is never rendered (DESIGN.md §5). Server actions re-check
// everything; this component is presentation + optimistic feedback.
export default function StatusAdvance({
  leadId,
  status,
  priorStatus,
  canReopen,
}: {
  leadId: string;
  status: LeadStatus;
  priorStatus?: LeadStatus;
  canReopen: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const terminal = isTerminal(status);
  const currentIdx = FUNNEL.indexOf(status);
  // For a Lost lead, mark progress up to where it fell out of the funnel.
  const lostIdx = status === "LOST" && priorStatus ? FUNNEL.indexOf(priorStatus) : 1;

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res?.error) setError(res.error);
    });
  }

  const next = allowedTransitions(status);
  const reopenTo = terminal ? reopenTarget(status, priorStatus) : null;

  return (
    <div>
      <div className="stepper">
        {FUNNEL.map((s, i) => {
          let cls = "step";
          if (status === "LOST") {
            if (i <= lostIdx) cls += " done";
          } else if (i < currentIdx) {
            cls += " done";
          } else if (i === currentIdx) {
            cls += " current";
          }
          return (
            <div className={cls} key={s}>
              <span className="node" />
              <span className="lbl">{STATUS_LABELS[s]}</span>
            </div>
          );
        })}
      </div>

      {terminal ? (
        <>
          <div className="next-label">
            {STATUS_LABELS[status]} is frozen — Managers and Admins can reopen.
          </div>
          {canReopen && reopenTo && (
            <div className="next-actions">
              <button
                className="step-btn reopen"
                disabled={pending}
                onClick={() => run(() => reopenLead(leadId))}
              >
                {pending ? "Reopening…" : `Reopen to ${STATUS_LABELS[reopenTo]}`}
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="next-label">Allowed next steps from {STATUS_LABELS[status]}:</div>
          <div className="next-actions">
            {next.map((to) => {
              const cls = to === "LOST" ? "lost" : to === "WON" ? "won" : "adv";
              const label = to === "LOST" ? "Mark Lost" : to === "WON" ? "Mark Won" : `Move to ${STATUS_LABELS[to]} →`;
              return (
                <button
                  key={to}
                  className={`step-btn ${cls}`}
                  disabled={pending}
                  onClick={() => run(() => changeLeadStatus(leadId, to))}
                >
                  {pending ? "Saving…" : label}
                </button>
              );
            })}
          </div>
        </>
      )}

      {error && <div className="action-error">{error}</div>}

      <div className="rule-note">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
        One step forward at a time. Jumping straight to Won isn&apos;t offered — the transition
        rule only surfaces legal moves.
      </div>
    </div>
  );
}
