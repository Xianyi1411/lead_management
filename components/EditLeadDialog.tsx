"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateLead, type ActionResult } from "@/app/(app)/leads/actions";
import SourceField from "./SourceField";
import QualificationIntake from "./QualificationIntake";

type EditState = ActionResult & { ts?: number };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

export interface EditableLead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  source: string;
  dealValue: number;
  notes: string | null;
  budgetStatus: string;
  authority: string;
  timeline: string;
  budgetAmount: number | null;
  /** yyyy-mm-dd or "" */
  expectedClose: string;
}

// "Edit lead" button + centered dialog, matching the New lead / Add user pattern.
// Closes itself on a successful save; the revalidated detail page shows the changes.
export default function EditLeadDialog({
  lead,
  customSources = [],
}: {
  lead: EditableLead;
  customSources?: string[];
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const action = useMemo(() => updateLead.bind(null, lead.id), [lead.id]);
  const [state, formAction] = useFormState<EditState, FormData>(action, {});
  // Source and deal value are lifted so the qualification gate can score live.
  const [source, setSource] = useState(lead.source);
  const [dealValue, setDealValue] = useState(lead.dealValue);

  useEffect(() => {
    if (state.ts) ref.current?.close();
  }, [state.ts]);

  return (
    <>
      <button type="button" className="btn btn-ghost" onClick={() => ref.current?.showModal()}>
        Edit lead
      </button>

      <dialog
        ref={ref}
        className="modal"
        aria-label="Edit lead"
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
      >
        <div className="modal-head">
          Edit lead
          <button type="button" className="modal-close" aria-label="Close" onClick={() => ref.current?.close()}>
            ×
          </button>
        </div>
        <form className="modal-body" action={formAction}>
          {state?.error && <div className="login-error">{state.error}</div>}

          <div className="form-grid">
            <div className="field">
              <label htmlFor="el-name">Name</label>
              <input id="el-name" name="name" required defaultValue={lead.name} />
            </div>
            <div className="field">
              <label htmlFor="el-phone">Phone</label>
              <input id="el-phone" name="phone" required defaultValue={lead.phone} inputMode="tel" />
            </div>
            <div className="field">
              <label htmlFor="el-company">Company</label>
              <input id="el-company" name="company" defaultValue={lead.company ?? ""} placeholder="Optional" />
            </div>
            <div className="field">
              <label htmlFor="el-email">Email</label>
              <input id="el-email" name="email" type="email" defaultValue={lead.email ?? ""} placeholder="Optional" />
            </div>
            <div className="field">
              <label htmlFor="el-source">Source</label>
              <SourceField
                id="el-source"
                defaultValue={lead.source}
                customSources={customSources}
                onChange={setSource}
              />
            </div>
            <div className="field">
              <label htmlFor="el-dealValue">Deal value (RM)</label>
              <input
                id="el-dealValue"
                name="dealValue"
                type="number"
                min={0}
                step={500}
                defaultValue={lead.dealValue}
                onChange={(e) => setDealValue(Number(e.target.value))}
              />
            </div>
            <div className="field full">
              <label htmlFor="el-notes">Notes</label>
              <textarea id="el-notes" name="notes" defaultValue={lead.notes ?? ""} placeholder="Anything the team should know (optional)" />
            </div>
          </div>

          <div className="qual-head">Qualification</div>
          <QualificationIntake
            idPrefix="el"
            source={source}
            dealValue={dealValue}
            defaultBudget={lead.budgetStatus}
            defaultAuthority={lead.authority}
            defaultTimeline={lead.timeline}
            defaultBudgetAmount={lead.budgetAmount}
            defaultExpectedClose={lead.expectedClose}
          />

          <div className="form-actions">
            <SubmitButton />
            <button type="button" className="btn btn-ghost" onClick={() => ref.current?.close()}>
              Cancel
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
