"use client";

import { useState, useTransition } from "react";
import { deleteLead } from "@/app/(app)/leads/actions";

// Two-step inline confirm (no modal — DESIGN.md avoids modal-as-first-thought).
export default function DeleteLeadButton({ leadId, leadName }: { leadId: string; leadName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!confirming) {
    return (
      <button type="button" className="step-btn lost" onClick={() => setConfirming(true)}>
        Delete lead
      </button>
    );
  }

  return (
    <span style={{ display: "inline-flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontSize: 12.5, color: "var(--slate)" }}>
        Delete <b>{leadName}</b> and its whole activity history?
      </span>
      <button
        type="button"
        className="step-btn lost"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await deleteLead(leadId);
            if (res?.error) setError(res.error);
          });
        }}
      >
        {pending ? "Deleting…" : "Yes, delete"}
      </button>
      <button type="button" className="step-btn reopen" disabled={pending} onClick={() => setConfirming(false)}>
        Keep it
      </button>
      {error && <span className="action-error" style={{ marginTop: 0 }}>{error}</span>}
    </span>
  );
}
