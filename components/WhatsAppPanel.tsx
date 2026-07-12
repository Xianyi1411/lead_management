"use client";

import { useState, useTransition } from "react";
import { logWhatsAppContact } from "@/app/(app)/leads/actions";
import { TEMPLATES, buildWaLink, fillTemplate, type TemplateKey } from "@/lib/whatsapp";

// Template picker → editable preview → wa.me deep link. Logs a WHATSAPP_CONTACT
// activity at click time: intent to contact, not proof of delivery (ADR-0002).
export default function WhatsAppPanel({
  leadId,
  phone,
  leadName,
  company,
  repName,
}: {
  leadId: string;
  phone: string;
  leadName: string;
  company: string | null;
  repName: string;
}) {
  const vars = { leadName: leadName.split(" ")[0], company: company ?? undefined, repName };
  const [active, setActive] = useState<TemplateKey>("intro");
  const [message, setMessage] = useState(() => fillTemplate(TEMPLATES.intro.body, vars));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pick(key: TemplateKey) {
    setActive(key);
    setMessage(fillTemplate(TEMPLATES[key].body, vars));
  }

  function openWhatsApp() {
    setError(null);
    // Open first (popup blockers require it inside the click), then log intent.
    window.open(buildWaLink(phone, message), "_blank", "noopener");
    startTransition(async () => {
      const res = await logWhatsAppContact(leadId, active);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div>
      <div className="wa-head">
        <svg className="wa-glyph" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.6-.6-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 .9-2.2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .5l-.4.6c-.1.2-.3.3-.1.6.1.3.7 1.1 1.4 1.7.9.8 1.7 1.1 2 1.2.2.1.4.1.5-.1l.6-.7c.2-.2.4-.2.6-.1l1.8.9c.2.1.4.2.4.3.1.1.1.6-.1 1.2Z" />
        </svg>
        <div className="wa-note">Opens WhatsApp with a pre-filled message and logs the contact.</div>
      </div>

      <div className="tpl-select" role="tablist" aria-label="Message template">
        {(Object.keys(TEMPLATES) as TemplateKey[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active === key}
            className={`tpl${active === key ? " on" : ""}`}
            onClick={() => pick(key)}
          >
            {TEMPLATES[key].label}
          </button>
        ))}
      </div>

      <textarea
        className="wa-preview"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        aria-label="Message preview — edit before sending"
      />

      {error && <div className="action-error">{error}</div>}

      <div className="wa-foot">
        <small>Logs a WhatsApp Contact — intent to contact, not proof of delivery.</small>
        <button type="button" className="btn btn-wa" onClick={openWhatsApp} disabled={pending}>
          {pending ? "Logging…" : "Open WhatsApp"}
        </button>
      </div>
    </div>
  );
}
