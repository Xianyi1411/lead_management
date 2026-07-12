"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createUser, type UserActionResult } from "@/app/(app)/users/actions";
import { ROLES, ROLE_LABELS } from "@/lib/domain";
import Dropdown from "./Dropdown";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "Adding…" : "Add user"}
    </button>
  );
}

// "Add user" button + centered dialog. Closes (and resets) itself on success;
// the revalidated user list appears behind it. Escape and backdrop clicks close.
export default function AddUserDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState<UserActionResult, FormData>(createUser, {});

  useEffect(() => {
    if (state.ts) {
      formRef.current?.reset();
      ref.current?.close();
    }
  }, [state.ts]);

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => ref.current?.showModal()}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add user
      </button>

      <dialog
        ref={ref}
        className="modal"
        aria-label="Add a user"
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
      >
        <div className="modal-head">
          Add a user
          <button type="button" className="modal-close" aria-label="Close" onClick={() => ref.current?.close()}>
            ×
          </button>
        </div>
        <form ref={formRef} className="modal-body" action={formAction}>
          {state?.error && <div className="login-error">{state.error}</div>}

          <div className="form-grid">
            <div className="field">
              <label htmlFor="nu-name">Name</label>
              <input id="nu-name" name="name" required placeholder="e.g. Aisyah Binti Omar" />
            </div>
            <div className="field">
              <label htmlFor="nu-email">Email</label>
              <input id="nu-email" name="email" type="email" required placeholder="name@company.my" />
            </div>
            <div className="field">
              <label htmlFor="nu-password">Password</label>
              <input id="nu-password" name="password" type="password" required minLength={8} placeholder="At least 8 characters" />
            </div>
            <div className="field">
              <label htmlFor="nu-role">Role</label>
              <Dropdown
                id="nu-role"
                name="role"
                defaultValue="SALES_REP"
                options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
              />
            </div>
          </div>

          <div className="form-actions">
            <SubmitButton />
            <button type="button" className="btn btn-ghost" onClick={() => ref.current?.close()}>
              Cancel
            </button>
          </div>

          <div style={{ marginTop: 14, fontSize: 12, color: "var(--slate)" }}>
            Share the password with them privately — they can sign in right away.
          </div>
        </form>
      </dialog>
    </>
  );
}
