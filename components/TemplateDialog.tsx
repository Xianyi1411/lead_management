"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createTemplate, updateTemplate } from "@/app/(app)/templates/actions";
import type { ActionResult } from "@/app/(app)/leads/actions";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/domain";

type DialogState = ActionResult & { ts?: number };

export interface EditableTemplate {
  id: string;
  label: string;
  body: string;
  roles: Role[];
}

function SubmitButton({ isNew }: { isNew: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "Saving…" : isNew ? "Add template" : "Save changes"}
    </button>
  );
}

// Create/edit dialog for WhatsApp templates (Blueprint §14.9) — same centered
// native-<dialog> pattern as the lead and user dialogs. Role checkboxes decide
// which users see the template in the WhatsApp panel.
export default function TemplateDialog({ template }: { template?: EditableTemplate }) {
  const isNew = !template;
  const ref = useRef<HTMLDialogElement>(null);
  const action = useMemo(
    () => (template ? updateTemplate.bind(null, template.id) : createTemplate),
    [template]
  );
  const [state, formAction] = useFormState<DialogState, FormData>(action, {});
  const [roles, setRoles] = useState<Role[]>(template?.roles ?? [...ROLES]);

  useEffect(() => {
    if (state.ts) ref.current?.close();
  }, [state.ts]);

  function toggleRole(role: Role) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  const idp = template?.id ?? "new";

  return (
    <>
      {isNew ? (
        <button type="button" className="btn btn-primary" onClick={() => ref.current?.showModal()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New template
        </button>
      ) : (
        <button type="button" className="rowlink" onClick={() => ref.current?.showModal()}>
          Edit
        </button>
      )}

      <dialog
        ref={ref}
        className="modal"
        aria-label={isNew ? "New template" : "Edit template"}
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
      >
        <div className="modal-head">
          {isNew ? "New template" : "Edit template"}
          <button type="button" className="modal-close" aria-label="Close" onClick={() => ref.current?.close()}>
            ×
          </button>
        </div>
        <form className="modal-body" action={formAction}>
          {state?.error && <div className="login-error">{state.error}</div>}

          <div className="field">
            <label htmlFor={`tpl-${idp}-label`}>Template name</label>
            <input
              id={`tpl-${idp}-label`}
              name="label"
              required
              maxLength={40}
              defaultValue={template?.label ?? ""}
              placeholder="e.g. Payment reminder"
            />
          </div>

          <div className="field">
            <label htmlFor={`tpl-${idp}-body`}>Message</label>
            <textarea
              id={`tpl-${idp}-body`}
              name="body"
              required
              maxLength={500}
              defaultValue={template?.body ?? ""}
              placeholder="Hi {leadName}, this is {repName} from …"
              style={{ minHeight: 110 }}
            />
            <div className="tpl-hint">
              Placeholders fill in automatically: <code>{"{leadName}"}</code>{" "}
              <code>{"{company}"}</code> <code>{"{repName}"}</code>
            </div>
          </div>

          <div className="field">
            <label id={`tpl-${idp}-roles-lbl`}>Available to</label>
            {/* Segmented multi-select: one connected control, selected segments
                fill iris. Tap to toggle each role on or off. */}
            <div className="seg-select" role="group" aria-labelledby={`tpl-${idp}-roles-lbl`}>
              {ROLES.map((role) => {
                const on = roles.includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    className={`seg-opt${on ? " on" : ""}`}
                    onClick={() => toggleRole(role)}
                  >
                    {on && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                    {ROLE_LABELS[role]}
                  </button>
                );
              })}
            </div>
            <div className="tpl-hint">
              {roles.length === 0
                ? "Pick at least one role — nobody can send this template right now."
                : "Tap a role to toggle it. Only ticked roles see this template in the WhatsApp panel."}
            </div>
            <input type="hidden" name="roles" value={roles.join(",")} readOnly />
          </div>

          <div className="form-actions">
            <SubmitButton isNew={isNew} />
            <button type="button" className="btn btn-ghost" onClick={() => ref.current?.close()}>
              Cancel
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
