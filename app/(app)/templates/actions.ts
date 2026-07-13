"use server";

// Template management (Blueprint §14.9). Manager/Admin only (`manage_templates`),
// enforced here, never only in the UI. Templates aren't lead-scoped so no
// Activity rows are written — but every save is validated so a typo'd
// placeholder can never reach a customer.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { invalidPlaceholders, parseTemplateRoles } from "@/lib/whatsapp";
import type { ActionResult } from "../leads/actions";

interface TemplateFields {
  label: string;
  body: string;
  roles: string; // canonical CSV
}

async function validateFields(
  formData: FormData,
  excludeId?: string
): Promise<TemplateFields | { error: string }> {
  const label = String(formData.get("label") ?? "").trim().replace(/\s+/g, " ");
  const body = String(formData.get("body") ?? "").trim();
  const roles = parseTemplateRoles(String(formData.get("roles") ?? ""));

  if (label.length < 2) return { error: "Give the template a name (2+ characters)." };
  if (label.length > 40) return { error: "Keep the template name under 40 characters." };
  if (body.length < 10) return { error: "The message is too short to be useful." };
  if (body.length > 500) return { error: "Keep the message under 500 characters." };
  const bad = invalidPlaceholders(body);
  if (bad.length > 0) {
    return { error: `Unknown placeholder ${bad.join(", ")} — use {leadName}, {company}, {repName}.` };
  }
  if (roles.length === 0) return { error: "Pick at least one role that can use this template." };

  const clash = await prisma.messageTemplate.findUnique({ where: { label } });
  if (clash && clash.id !== excludeId) return { error: "A template with that name already exists." };

  return { label, body, roles: roles.join(",") };
}

export async function createTemplate(
  _prev: ActionResult & { ts?: number },
  formData: FormData
): Promise<ActionResult & { ts?: number }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your session expired. Sign in again." };
  if (!can(user, "manage_templates")) return { error: "Only a Manager or Admin can manage templates." };

  const fields = await validateFields(formData);
  if ("error" in fields) return fields;

  await prisma.messageTemplate.create({ data: fields });
  revalidatePath("/templates");
  return { ts: Date.now() }; // success marker — the dialog closes on it
}

export async function updateTemplate(
  templateId: string,
  _prev: ActionResult & { ts?: number },
  formData: FormData
): Promise<ActionResult & { ts?: number }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your session expired. Sign in again." };
  if (!can(user, "manage_templates")) return { error: "Only a Manager or Admin can manage templates." };

  const existing = await prisma.messageTemplate.findUnique({ where: { id: templateId } });
  if (!existing) return { error: "This template no longer exists." };

  const fields = await validateFields(formData, templateId);
  if ("error" in fields) return fields;

  await prisma.messageTemplate.update({ where: { id: templateId }, data: fields });
  revalidatePath("/templates");
  return { ts: Date.now() };
}

export async function deleteTemplate(templateId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your session expired. Sign in again." };
  if (!can(user, "manage_templates")) return { error: "Only a Manager or Admin can manage templates." };

  // Past WHATSAPP_CONTACT activities keep their text — deleting a template
  // never rewrites history (the audit trail stores the label, not a reference).
  await prisma.messageTemplate.delete({ where: { id: templateId } }).catch(() => undefined);
  revalidatePath("/templates");
  return {};
}
