"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";

type NoteState = { error?: string; ts?: number };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-soft" disabled={pending}>
      {pending ? "Adding…" : "Add note"}
    </button>
  );
}

// `action` is addNote pre-bound to the lead id. On success (state.ts changes) the
// input clears; the new NOTE entry appears at the top of the timeline.
export default function AddNoteForm({
  action,
}: {
  action: (prev: NoteState, formData: FormData) => Promise<NoteState>;
}) {
  const [state, formAction] = useFormState<NoteState, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ts) formRef.current?.reset();
  }, [state.ts]);

  return (
    <div style={{ marginBottom: 14 }}>
      <form ref={formRef} action={formAction} className="note-row">
        <input name="note" placeholder="Add a note to the timeline…" aria-label="Add a note" maxLength={500} />
        <SubmitButton />
      </form>
      {state.error && <div className="action-error">{state.error}</div>}
    </div>
  );
}
