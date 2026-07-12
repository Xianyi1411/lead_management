"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import type { ActionResult } from "@/app/(app)/leads/actions";
import { LEAD_SOURCES, SOURCE_LABELS } from "@/lib/domain";

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
}

// `action` is updateLead pre-bound to the lead id by the server page.
export default function EditLeadForm({
  lead,
  action,
}: {
  lead: EditableLead;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}) {
  const [state, formAction] = useFormState<ActionResult, FormData>(action, {});

  return (
    <form className="card" style={{ maxWidth: 640 }} action={formAction}>
      <div className="card-h">Edit lead</div>
      <div className="card-b">
        {state?.error && <div className="login-error">{state.error}</div>}

        <div className="form-grid">
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" required defaultValue={lead.name} />
          </div>
          <div className="field">
            <label htmlFor="phone">Phone</label>
            <input id="phone" name="phone" required defaultValue={lead.phone} inputMode="tel" />
          </div>
          <div className="field">
            <label htmlFor="company">Company</label>
            <input id="company" name="company" defaultValue={lead.company ?? ""} placeholder="Optional" />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" defaultValue={lead.email ?? ""} placeholder="Optional" />
          </div>
          <div className="field">
            <label htmlFor="source">Source</label>
            <select id="source" name="source" defaultValue={lead.source}>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="dealValue">Deal value (RM)</label>
            <input id="dealValue" name="dealValue" type="number" min={0} step={500} defaultValue={lead.dealValue} />
          </div>
          <div className="field full">
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" name="notes" defaultValue={lead.notes ?? ""} placeholder="Anything the team should know (optional)" />
          </div>
        </div>

        <div className="form-actions">
          <SubmitButton />
          <Link href={`/leads/${lead.id}`} className="btn btn-ghost">
            Cancel
          </Link>
        </div>
      </div>
    </form>
  );
}
