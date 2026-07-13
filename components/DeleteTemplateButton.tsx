"use client";

import { useState, useTransition } from "react";
import { deleteTemplate } from "@/app/(app)/templates/actions";

// Two-step inline confirm, matching the delete-lead pattern. Deleting a
// template never rewrites past activities — they store the label as text.
export default function DeleteTemplateButton({ templateId }: { templateId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button type="button" className="btn btn-ghost tpl-del" onClick={() => setConfirming(true)}>
        Delete
      </button>
    );
  }

  return (
    <span className="tpl-del-confirm">
      <button
        type="button"
        className="btn btn-ghost tpl-del on"
        disabled={pending}
        onClick={() => startTransition(async () => void (await deleteTemplate(templateId)))}
      >
        {pending ? "Deleting…" : "Confirm delete"}
      </button>
      <button type="button" className="btn btn-ghost" disabled={pending} onClick={() => setConfirming(false)}>
        Keep
      </button>
    </span>
  );
}
