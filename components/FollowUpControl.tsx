"use client";

import { useState, useTransition } from "react";
import { setFollowUp } from "@/app/(app)/leads/actions";

function toInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Schedule / clear the next follow-up on a lead. The date drives the Needs
// attention queue on the dashboard and the Follow-up column on the table.
export default function FollowUpControl({
  leadId,
  nextFollowUpAt,
}: {
  leadId: string;
  nextFollowUpAt: string | null; // ISO string (server components pass serialisable props)
}) {
  const current = nextFollowUpAt ? new Date(nextFollowUpAt) : null;
  const [date, setDate] = useState(current ? toInputValue(current) : "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const overdue = current !== null && current.getTime() < Date.now();

  function save(next: string | null) {
    setError(null);
    startTransition(async () => {
      const res = await setFollowUp(leadId, next);
      if (res?.error) setError(res.error);
      else if (next === null) setDate("");
    });
  }

  return (
    <div className="fu">
      <div className="fu-state">
        {current ? (
          <>
            Next follow-up{" "}
            <b className={overdue ? "fu-overdue" : undefined}>
              {current.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
            </b>
            {overdue && <span className="fu-flag">Overdue</span>}
          </>
        ) : (
          <>No follow-up scheduled — leads without a next step go quiet.</>
        )}
      </div>
      <div className="fu-row">
        <input
          type="date"
          aria-label="Next follow-up date"
          value={date}
          min={toInputValue(new Date())}
          onChange={(e) => setDate(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-ghost"
          disabled={pending || !date}
          onClick={() => save(date)}
        >
          {pending ? "Saving…" : current ? "Reschedule" : "Schedule"}
        </button>
        {current && (
          <button type="button" className="btn btn-ghost" disabled={pending} onClick={() => save(null)}>
            Clear
          </button>
        )}
      </div>
      {error && <div className="action-error">{error}</div>}
    </div>
  );
}
