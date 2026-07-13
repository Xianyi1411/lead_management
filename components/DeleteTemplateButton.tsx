"use client";

import { useState, useTransition } from "react";
import { deleteTemplate } from "@/app/(app)/templates/actions";

// Two-step inline confirm as quiet row-level text actions (DESIGN.md §9 —
// row actions never compete with the primary button). Deleting a template
// never rewrites past activities — they store the label as text.
export default function DeleteTemplateButton({ templateId }: { templateId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button type="button" className="rowlink danger" onClick={() => setConfirming(true)}>
        Delete
      </button>
    );
  }

  return (
    <span className="row-actions">
      <button
        type="button"
        className="rowlink danger strong"
        disabled={pending}
        onClick={() => startTransition(async () => void (await deleteTemplate(templateId)))}
      >
        {pending ? "Deleting…" : "Confirm delete"}
      </button>
      <button
        type="button"
        className="rowlink"
        disabled={pending}
        onClick={() => setConfirming(false)}
      >
        Keep
      </button>
    </span>
  );
}
