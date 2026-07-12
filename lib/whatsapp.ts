// WhatsApp click-to-chat link builder + templates (Blueprint §9/§10, ADR-0002).
// Pure and unit-tested — see tests/whatsapp.test.ts.
// The app logs *intent to contact* (a WHATSAPP_CONTACT activity), not delivery.

export interface TemplateVars {
  leadName: string;
  company?: string;
  repName: string;
}

export type TemplateKey = "intro" | "followUp" | "proposalFollowUp";

export const TEMPLATES: Record<TemplateKey, { label: string; body: string }> = {
  intro: {
    label: "Intro",
    body:
      "Hi {leadName}, this is {repName}. Thanks for your interest — I'd love to help {company} with our solution. Are you free for a quick chat this week?",
  },
  followUp: {
    label: "Follow-up",
    body:
      "Hi {leadName}, following up on our earlier conversation. Do you have any questions I can help with?",
  },
  proposalFollowUp: {
    label: "Proposal follow-up",
    body:
      "Hi {leadName}, just checking in on the proposal we sent {company}. Happy to walk you through it whenever suits you.",
  },
};

/**
 * Normalise a phone number to the digits wa.me expects (country code + number, no
 * "+", spaces, or dashes). Malaysian local numbers starting with "0" are converted
 * to the "60" country code (e.g. "012-345 6789" → "60123456789").
 */
export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    digits = "60" + digits.slice(1);
  }
  return digits;
}

/** Substitute {leadName}, {company}, {repName} in a template body. */
export function fillTemplate(template: string, vars: TemplateVars): string {
  return template
    .replace(/\{leadName\}/g, vars.leadName)
    .replace(/\{company\}/g, vars.company && vars.company.trim() ? vars.company : "your team")
    .replace(/\{repName\}/g, vars.repName);
}

/** Build the wa.me deep link with the message URL-encoded. */
export function buildWaLink(phone: string, message: string): string {
  const normalized = normalizePhone(phone);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
