// Permission rule (Blueprint §3, CONTEXT.md roles).
// Pure and unit-tested — see tests/permissions.test.ts.
// Enforced server-side in every API route / server action, never only in the UI.

import { Role } from "./domain";

export type Action =
  | "manage_users"
  | "view_all_leads"
  | "view_lead"
  | "create_lead"
  | "edit_lead"
  | "delete_lead"
  | "assign_lead"
  | "change_status"
  | "reopen_lead"
  | "whatsapp_contact"
  | "add_note"
  | "view_reports"
  | "manage_templates";

/** Minimal shapes so this module stays free of Prisma / framework types. */
export interface ActingUser {
  id: string;
  role: Role;
}
export interface LeadRef {
  assignedToId: string | null;
}

/** A Sales Rep "owns" a lead when it is assigned to them. */
export function isOwnLead(user: ActingUser, lead: LeadRef | undefined): boolean {
  return !!lead && lead.assignedToId === user.id;
}

/**
 * Can `user` perform `action`? For lead-scoped actions, pass the `lead`; a Sales Rep
 * is limited to leads assigned to them, while Admin/Manager act team-/system-wide.
 */
export function can(user: ActingUser, action: Action, lead?: LeadRef): boolean {
  const isAdmin = user.role === "ADMIN";
  const isManager = user.role === "MANAGER";
  const isRep = user.role === "SALES_REP";
  const managerOrAdmin = isAdmin || isManager;

  switch (action) {
    // Admin-only
    case "manage_users":
      return isAdmin;

    // Manager/Admin only (reports compare reps against each other — a Rep's
    // personal numbers already live on their own dashboard; templates are
    // outbound wording, a management responsibility)
    case "view_all_leads":
    case "delete_lead":
    case "assign_lead":
    case "reopen_lead":
    case "view_reports":
    case "manage_templates":
      return managerOrAdmin;

    // Everyone can create a lead (reps meet prospects in the field)
    case "create_lead":
      return isAdmin || isManager || isRep;

    // Lead-scoped: Manager/Admin always; Rep only on their own leads
    case "view_lead":
    case "edit_lead":
    case "change_status":
    case "whatsapp_contact":
    case "add_note":
      if (managerOrAdmin) return true;
      if (isRep) return isOwnLead(user, lead);
      return false;

    default:
      return false;
  }
}

/**
 * The set of leads a user may see, as a Prisma-style `where` fragment.
 * Admin/Manager see everything; a Rep sees only leads assigned to them.
 */
export function leadScopeWhere(user: ActingUser): { assignedToId?: string } {
  if (user.role === "SALES_REP") return { assignedToId: user.id };
  return {};
}
