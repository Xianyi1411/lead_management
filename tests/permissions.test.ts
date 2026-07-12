import { describe, it, expect } from "vitest";
import { can, isOwnLead, leadScopeWhere, ActingUser } from "@/lib/permissions";

const admin: ActingUser = { id: "u-admin", role: "ADMIN" };
const manager: ActingUser = { id: "u-mgr", role: "MANAGER" };
const rep: ActingUser = { id: "u-rep", role: "SALES_REP" };

const ownLead = { assignedToId: "u-rep" };
const othersLead = { assignedToId: "u-other" };
const unassignedLead = { assignedToId: null };

describe("user management", () => {
  it("is Admin-only", () => {
    expect(can(admin, "manage_users")).toBe(true);
    expect(can(manager, "manage_users")).toBe(false);
    expect(can(rep, "manage_users")).toBe(false);
  });
});

describe("Manager/Admin-only lead actions", () => {
  it.each(["view_all_leads", "delete_lead", "assign_lead", "reopen_lead"] as const)(
    "%s is allowed for Admin and Manager, denied for Rep",
    (action) => {
      expect(can(admin, action)).toBe(true);
      expect(can(manager, action)).toBe(true);
      expect(can(rep, action)).toBe(false);
    }
  );
});

describe("create lead", () => {
  it("is allowed for every role", () => {
    expect(can(admin, "create_lead")).toBe(true);
    expect(can(manager, "create_lead")).toBe(true);
    expect(can(rep, "create_lead")).toBe(true);
  });
});

describe("lead-scoped actions honour ownership for Reps", () => {
  it.each(["view_lead", "edit_lead", "change_status", "whatsapp_contact", "add_note"] as const)(
    "%s: Manager/Admin always; Rep only on own leads",
    (action) => {
      expect(can(admin, action, othersLead)).toBe(true);
      expect(can(manager, action, othersLead)).toBe(true);
      expect(can(rep, action, ownLead)).toBe(true);
      expect(can(rep, action, othersLead)).toBe(false);
      expect(can(rep, action, unassignedLead)).toBe(false);
      expect(can(rep, action, undefined)).toBe(false);
    }
  );
});

describe("isOwnLead", () => {
  it("matches on assignedToId", () => {
    expect(isOwnLead(rep, ownLead)).toBe(true);
    expect(isOwnLead(rep, othersLead)).toBe(false);
    expect(isOwnLead(rep, undefined)).toBe(false);
  });
});

describe("leadScopeWhere", () => {
  it("limits Reps to their own leads and leaves Manager/Admin unscoped", () => {
    expect(leadScopeWhere(rep)).toEqual({ assignedToId: "u-rep" });
    expect(leadScopeWhere(manager)).toEqual({});
    expect(leadScopeWhere(admin)).toEqual({});
  });
});
