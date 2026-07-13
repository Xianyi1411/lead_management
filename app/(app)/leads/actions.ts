"use server";

// Lead mutations. Every action re-checks auth + permissions + the transition rule
// server-side (Blueprint §9: enforcement lives here, never only in the UI), and
// writes the corresponding Activity row so the audit trail stays complete.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { canTransition, isTerminal, reopenTarget } from "@/lib/transitions";
import {
  STATUS_LABELS,
  SOURCE_LABELS,
  LOST_REASON_LABELS,
  isLeadStatus,
  isLeadSource,
  isBudgetStatus,
  isAuthority,
  isTimeline,
  isLostReason,
  type LeadStatus,
} from "@/lib/domain";
import { TEMPLATES, type TemplateKey } from "@/lib/whatsapp";
import { qualificationScore, qualificationVerdict, VERDICT_LABELS } from "@/lib/scoring";

export interface ActionResult {
  error?: string;
}

function revalidateLead(leadId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
}

/** Prior active status of a Lost lead, parsed from its last "X → Lost" activity. */
async function lostPriorStatus(leadId: string): Promise<LeadStatus | undefined> {
  const last = await prisma.activity.findFirst({
    where: { leadId, type: "STATUS_CHANGE", detail: { contains: "→ Lost" } },
    orderBy: { createdAt: "desc" },
  });
  const fromLabel = last?.detail.split("→")[0]?.trim();
  const hit = Object.entries(STATUS_LABELS).find(([, label]) => label === fromLabel);
  return hit ? (hit[0] as LeadStatus) : undefined;
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
export async function createLead(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your session expired. Sign in again." };
  if (!can(user, "create_lead")) return { error: "You don't have permission to add leads." };

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const source = String(formData.get("source") ?? "OTHER");
  const notes = String(formData.get("notes") ?? "").trim();
  const dealValue = Math.round(Number(formData.get("dealValue") ?? 0));
  const budgetStatus = String(formData.get("budgetStatus") ?? "UNKNOWN");
  const authority = String(formData.get("authority") ?? "UNKNOWN");
  const timeline = String(formData.get("timeline") ?? "UNKNOWN");

  if (!name) return { error: "Enter the lead's name." };
  if (phone.replace(/\D/g, "").length < 8) return { error: "Enter a valid phone number." };
  if (!isLeadSource(source)) return { error: "Pick a source from the list." };
  if (!Number.isFinite(dealValue) || dealValue < 0) return { error: "Deal value must be 0 or more." };
  if (!isBudgetStatus(budgetStatus) || !isAuthority(authority) || !isTimeline(timeline)) {
    return { error: "Pick the qualification answers from the lists." };
  }

  // The intake gate's number is part of the audit trail: the CREATED activity
  // records what the lead scored (and the verdict) at the moment it was added.
  const fit = qualificationScore({ budgetStatus, authority, timeline, source, dealValue });
  const verdict = VERDICT_LABELS[qualificationVerdict(fit)];

  const lead = await prisma.lead.create({
    data: {
      name,
      phone,
      email: email || null,
      company: company || null,
      source,
      notes: notes || null,
      dealValue,
      budgetStatus,
      authority,
      timeline,
      status: "NEW",
      createdById: user.id,
    },
  });

  await prisma.activity.create({
    data: {
      leadId: lead.id,
      userId: user.id,
      type: "CREATED",
      detail: `Lead created · source ${SOURCE_LABELS[source]} · fit ${fit}/100 (${verdict})`,
    },
  });

  revalidateLead(lead.id);
  redirect(`/leads/${lead.id}`);
}

// ---------------------------------------------------------------------------
// Edit (Manager/Admin any lead; Rep own leads only). Edits change lead facts,
// not pipeline history, so no Activity row is written (Blueprint §4 activity list).
// ---------------------------------------------------------------------------
export async function updateLead(
  leadId: string,
  _prev: ActionResult & { ts?: number },
  formData: FormData
): Promise<ActionResult & { ts?: number }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { error: "This lead no longer exists." };
  if (!can(user, "edit_lead", lead)) return { error: "You can only edit your own leads." };

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const source = String(formData.get("source") ?? "OTHER");
  const notes = String(formData.get("notes") ?? "").trim();
  const dealValue = Math.round(Number(formData.get("dealValue") ?? 0));
  const budgetStatus = String(formData.get("budgetStatus") ?? "UNKNOWN");
  const authority = String(formData.get("authority") ?? "UNKNOWN");
  const timeline = String(formData.get("timeline") ?? "UNKNOWN");

  if (!name) return { error: "Enter the lead's name." };
  if (phone.replace(/\D/g, "").length < 8) return { error: "Enter a valid phone number." };
  if (!isLeadSource(source)) return { error: "Pick a source from the list." };
  if (!Number.isFinite(dealValue) || dealValue < 0) return { error: "Deal value must be 0 or more." };
  if (!isBudgetStatus(budgetStatus) || !isAuthority(authority) || !isTimeline(timeline)) {
    return { error: "Pick the qualification answers from the lists." };
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      name,
      phone,
      email: email || null,
      company: company || null,
      source,
      notes: notes || null,
      dealValue,
      budgetStatus,
      authority,
      timeline,
    },
  });

  revalidateLead(leadId);
  return { ts: Date.now() }; // success marker — the edit dialog closes on it
}

// ---------------------------------------------------------------------------
// Add a note to the timeline
// ---------------------------------------------------------------------------
export async function addNote(
  leadId: string,
  _prev: ActionResult & { ts?: number },
  formData: FormData
): Promise<ActionResult & { ts?: number }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { error: "This lead no longer exists." };
  if (!can(user, "add_note", lead)) return { error: "You can only add notes to your own leads." };

  const note = String(formData.get("note") ?? "").trim();
  if (!note) return { error: "Write the note first." };
  if (note.length > 500) return { error: "Keep notes under 500 characters." };

  await prisma.activity.create({
    data: { leadId, userId: user.id, type: "NOTE", detail: note },
  });

  revalidateLead(leadId);
  return { ts: Date.now() }; // success marker — the form uses it to reset itself
}

// ---------------------------------------------------------------------------
// Status change (the transition rule, enforced)
// ---------------------------------------------------------------------------
export async function changeLeadStatus(
  leadId: string,
  to: string,
  lostReason?: string
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { error: "This lead no longer exists." };
  if (!can(user, "change_status", lead)) return { error: "You can only change status on your own leads." };
  if (!isLeadStatus(to)) return { error: "That isn't a valid status." };

  const from = lead.status as LeadStatus;
  if (!canTransition(from, to)) {
    return { error: `${STATUS_LABELS[from]} can't move to ${STATUS_LABELS[to]} — one step forward at a time.` };
  }

  // Losing a lead must record WHY — that's what the win/loss report learns from.
  if (to === "LOST" && !(lostReason && isLostReason(lostReason))) {
    return { error: "Pick a reason before marking this lead Lost." };
  }
  const reason = to === "LOST" && lostReason && isLostReason(lostReason) ? lostReason : null;

  await prisma.lead.update({
    where: { id: leadId },
    data: { status: to, lostReason: reason },
  });
  await prisma.activity.create({
    data: {
      leadId,
      userId: user.id,
      type: "STATUS_CHANGE",
      detail:
        `${STATUS_LABELS[from]} → ${STATUS_LABELS[to]}` +
        (reason ? ` · ${LOST_REASON_LABELS[reason]}` : ""),
    },
  });

  revalidateLead(leadId);
  return {};
}

// ---------------------------------------------------------------------------
// Reopen a terminal lead (Manager/Admin only)
// ---------------------------------------------------------------------------
export async function reopenLead(leadId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your session expired. Sign in again." };
  if (!can(user, "reopen_lead")) return { error: "Only a Manager or Admin can reopen a closed lead." };

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { error: "This lead no longer exists." };

  const status = lead.status as LeadStatus;
  if (!isTerminal(status)) return { error: "Only Won or Lost leads can be reopened." };

  const prior = status === "LOST" ? await lostPriorStatus(leadId) : undefined;
  const target = reopenTarget(status, prior)!;

  // Back into the active funnel — the lost reason no longer applies.
  await prisma.lead.update({ where: { id: leadId }, data: { status: target, lostReason: null } });
  await prisma.activity.create({
    data: {
      leadId,
      userId: user.id,
      type: "STATUS_CHANGE",
      detail: `Reopened → ${STATUS_LABELS[target]}`,
    },
  });

  revalidateLead(leadId);
  return {};
}

// ---------------------------------------------------------------------------
// Follow-up scheduling — the "what do I do today" queue is built from this
// ---------------------------------------------------------------------------
export async function setFollowUp(leadId: string, dateStr: string | null): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { error: "This lead no longer exists." };
  if (!can(user, "edit_lead", lead)) return { error: "You can only schedule follow-ups on your own leads." };

  let followUp: Date | null = null;
  if (dateStr) {
    const parsed = new Date(`${dateStr}T09:00:00`); // due at 9am local on the chosen day
    if (Number.isNaN(parsed.getTime())) return { error: "That isn't a valid date." };
    followUp = parsed;
  }

  await prisma.lead.update({ where: { id: leadId }, data: { nextFollowUpAt: followUp } });
  await prisma.activity.create({
    data: {
      leadId,
      userId: user.id,
      type: "FOLLOW_UP",
      detail: followUp
        ? `Follow-up scheduled for ${followUp.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}`
        : "Follow-up cleared",
    },
  });

  revalidateLead(leadId);
  return {};
}

// ---------------------------------------------------------------------------
// Assign (Manager/Admin only) — used as a plain <form action>
// ---------------------------------------------------------------------------
export async function assignLead(leadId: string, formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !can(user, "assign_lead")) return;

  const repId = String(formData.get("userId") ?? "");
  if (!repId) return;

  const [lead, rep] = await Promise.all([
    prisma.lead.findUnique({ where: { id: leadId } }),
    prisma.user.findUnique({ where: { id: repId } }),
  ]);
  if (!lead || !rep || !rep.isActive || rep.role !== "SALES_REP") return;
  if (lead.assignedToId === rep.id) return;

  await prisma.lead.update({ where: { id: leadId }, data: { assignedToId: rep.id } });
  await prisma.activity.create({
    data: { leadId, userId: user.id, type: "ASSIGNMENT", detail: `Assigned to ${rep.name}` },
  });

  revalidateLead(leadId);
}

// ---------------------------------------------------------------------------
// WhatsApp contact — logs intent at click time (ADR-0002)
// ---------------------------------------------------------------------------
export async function logWhatsAppContact(leadId: string, templateKey: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { error: "This lead no longer exists." };
  if (!can(user, "whatsapp_contact", lead)) return { error: "You can only contact your own leads." };

  const template = TEMPLATES[templateKey as TemplateKey];
  await prisma.activity.create({
    data: {
      leadId,
      userId: user.id,
      type: "WHATSAPP_CONTACT",
      detail: template ? `${template.label} template` : "Custom message",
    },
  });

  revalidateLead(leadId);
  return {};
}

// ---------------------------------------------------------------------------
// Delete (Manager/Admin only)
// ---------------------------------------------------------------------------
export async function deleteLead(leadId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your session expired. Sign in again." };
  if (!can(user, "delete_lead")) return { error: "Only a Manager or Admin can delete a lead." };

  await prisma.lead.delete({ where: { id: leadId } }); // activities cascade
  revalidatePath("/dashboard");
  revalidatePath("/leads");
  redirect("/leads");
}
