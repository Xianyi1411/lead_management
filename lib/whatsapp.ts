// WhatsApp click-to-chat link builder + templates (Blueprint §9/§10, ADR-0002).
// Pure and unit-tested — see tests/whatsapp.test.ts.
// The app logs *intent to contact* (a WHATSAPP_CONTACT activity), not delivery.
//
// Since Blueprint §14.9 templates live in the MessageTemplate table (editable
// on /templates, role-scoped); TEMPLATES below is the built-in set the seed
// loads, kept here so the wording stays under test.

import { ROLES, type Role } from "./domain";

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

/** Every Role, as the CSV stored on a template available to the whole team. */
export const ALL_ROLES_CSV = ROLES.join(",");

/** Parse a template's roles CSV into valid Role values (unknown entries drop). */
export function parseTemplateRoles(rolesCsv: string): Role[] {
  return rolesCsv
    .split(",")
    .map((r) => r.trim())
    .filter((r): r is Role => (ROLES as readonly string[]).includes(r));
}

/** May `role` use a template whose roles column is `rolesCsv`? */
export function templateAllowedFor(rolesCsv: string, role: Role): boolean {
  return parseTemplateRoles(rolesCsv).includes(role);
}

/**
 * Placeholders a template body may use. Anything else in {braces} is a typo
 * that would reach a customer — the editor rejects it.
 */
export const TEMPLATE_PLACEHOLDERS = ["leadName", "company", "repName"] as const;

/** Unknown {placeholder} tokens in a body (empty = body is valid). */
export function invalidPlaceholders(body: string): string[] {
  const found = body.match(/\{[^{}]*\}/g) ?? [];
  return found.filter(
    (token) => !(TEMPLATE_PLACEHOLDERS as readonly string[]).includes(token.slice(1, -1))
  );
}

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
