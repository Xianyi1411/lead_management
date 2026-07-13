"use client";

import { useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createLead, type ActionResult } from "@/app/(app)/leads/actions";
import { LEAD_SOURCES, SOURCE_LABELS } from "@/lib/domain";
import Dropdown from "./Dropdown";
import QualificationIntake from "./QualificationIntake";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "Adding…" : "Add lead"}
    </button>
  );
}

// "New lead" button + centered dialog. On success createLead redirects to the new
// lead's page, so the dialog disappears with the navigation. Escape and backdrop
// clicks close it natively.
export default function AddLeadDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useFormState<ActionResult, FormData>(createLead, {});
  // Source and deal value are lifted so the qualification gate can score live.
  const [source, setSource] = useState("WEBSITE");
  const [dealValue, setDealValue] = useState(0);

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => ref.current?.showModal()}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 5v14M5 12h14" />
        </svg>
        New lead
      </button>

      <dialog
        ref={ref}
        className="modal"
        aria-label="Add a lead"
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
      >
        <div className="modal-head">
          Add a lead
          <button type="button" className="modal-close" aria-label="Close" onClick={() => ref.current?.close()}>
            ×
          </button>
        </div>
        <form className="modal-body" action={formAction}>
          {state?.error && <div className="login-error">{state.error}</div>}

          <div className="form-grid">
            <div className="field">
              <label htmlFor="nl-name">Name</label>
              <input id="nl-name" name="name" required placeholder="e.g. Nurul Aziz" />
            </div>
            <div className="field">
              <label htmlFor="nl-phone">Phone</label>
              <input id="nl-phone" name="phone" required placeholder="e.g. 012-345 6789" inputMode="tel" />
            </div>
            <div className="field">
              <label htmlFor="nl-company">Company</label>
              <input id="nl-company" name="company" placeholder="Optional" />
            </div>
            <div className="field">
              <label htmlFor="nl-email">Email</label>
              <input id="nl-email" name="email" type="email" placeholder="Optional" />
            </div>
            <div className="field">
              <label htmlFor="nl-source">Source</label>
              <Dropdown
                id="nl-source"
                name="source"
                defaultValue="WEBSITE"
                onChange={setSource}
                options={LEAD_SOURCES.map((s) => ({ value: s, label: SOURCE_LABELS[s] }))}
              />
            </div>
            <div className="field">
              <label htmlFor="nl-dealValue">Deal value (RM)</label>
              <input
                id="nl-dealValue"
                name="dealValue"
                type="number"
                min={0}
                step={500}
                defaultValue={0}
                onChange={(e) => setDealValue(Number(e.target.value))}
              />
            </div>
            <div className="field full">
              <label htmlFor="nl-notes">Notes</label>
              <textarea id="nl-notes" name="notes" placeholder="Anything the team should know (optional)" />
            </div>
          </div>

          <div className="qual-head">Qualification — is this lead worth the pipeline&apos;s time?</div>
          <QualificationIntake idPrefix="nl" source={source} dealValue={dealValue} />

          <div className="form-actions">
            <SubmitButton />
            <button type="button" className="btn btn-ghost" onClick={() => ref.current?.close()}>
              Cancel
            </button>
          </div>

          <div style={{ marginTop: 14, fontSize: 12, color: "var(--slate)" }}>
            New leads start as <b>New</b> and unassigned — a Manager or Admin assigns them to a Sales Rep.
          </div>
        </form>
      </dialog>
    </>
  );
}
