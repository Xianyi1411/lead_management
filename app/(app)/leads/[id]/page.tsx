import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import {
  STATUS_LABELS,
  BUDGET_LABELS,
  AUTHORITY_LABELS,
  TIMELINE_LABELS,
  LOST_REASON_LABELS,
  sourceLabel,
  isBudgetStatus,
  isAuthority,
  isTimeline,
  isLostReason,
  type ActivityType,
  type LeadStatus,
} from "@/lib/domain";
import { qualificationScore, qualificationVerdict, VERDICT_LABELS } from "@/lib/scoring";
import { formatRM, relativeTime } from "@/lib/format";
import Topbar from "@/components/Topbar";
import StatusPill from "@/components/StatusPill";
import StatusAdvance from "@/components/StatusAdvance";
import WhatsAppPanel from "@/components/WhatsAppPanel";
import DeleteLeadButton from "@/components/DeleteLeadButton";
import EditLeadDialog from "@/components/EditLeadDialog";
import AddNoteForm from "@/components/AddNoteForm";
import FollowUpControl from "@/components/FollowUpControl";
import Dropdown from "@/components/Dropdown";
import { assignLead, addNote } from "../actions";

const ACTIVITY_COLOR: Record<ActivityType, string> = {
  CREATED: "var(--new)",
  ASSIGNMENT: "var(--iris)",
  WHATSAPP_CONTACT: "var(--wa)",
  STATUS_CHANGE: "var(--qualified)",
  NOTE: "var(--slate)",
  FOLLOW_UP: "var(--proposal)",
};

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();

  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: {
      assignedTo: { select: { id: true, name: true } },
      activities: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } } },
      },
    },
  });

  // Same 404 for "missing" and "not yours" — don't leak which (Blueprint §9).
  if (!lead || !can(user, "view_lead", lead)) notFound();

  const status = lead.status as LeadStatus;
  const canAssign = can(user, "assign_lead");
  const canDelete = can(user, "delete_lead");
  const canReopen = can(user, "reopen_lead");
  const canWork = can(user, "change_status", lead);
  const canEdit = can(user, "edit_lead", lead);
  const canNote = can(user, "add_note", lead);

  // Prior status of a Lost lead, for the stepper + reopen target.
  let priorStatus: LeadStatus | undefined;
  if (status === "LOST") {
    const lastFall = lead.activities.find(
      (a) => a.type === "STATUS_CHANGE" && a.detail.includes("→ Lost")
    );
    const fromLabel = lastFall?.detail.split("→")[0]?.trim();
    const hit = Object.entries(STATUS_LABELS).find(([, label]) => label === fromLabel);
    if (hit) priorStatus = hit[0] as LeadStatus;
  }

  const [reps, customSources] = await Promise.all([
    canAssign
      ? prisma.user.findMany({
          where: { role: "SALES_REP", isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    canEdit
      ? prisma.customSource
          .findMany({ select: { name: true }, orderBy: { name: "asc" } })
          .then((rows) => rows.map((r) => r.name))
      : Promise.resolve([] as string[]),
  ]);

  // Fit score from the stored qualification facts (same rule as the intake gate).
  const fit = qualificationScore({
    budgetStatus: isBudgetStatus(lead.budgetStatus) ? lead.budgetStatus : "UNKNOWN",
    authority: isAuthority(lead.authority) ? lead.authority : "UNKNOWN",
    timeline: isTimeline(lead.timeline) ? lead.timeline : "UNKNOWN",
    source: lead.source,
    dealValue: lead.dealValue,
  });
  const fitVerdict = VERDICT_LABELS[qualificationVerdict(fit)];

  return (
    <>
      <Topbar title="Lead" role={user.role} />
      <div className="content screen-in">
        <div style={{ marginBottom: 14 }}>
          <Link href="/leads" className="back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="m15 18-6-6 6-6" />
            </svg>
            Leads
          </Link>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22, flexWrap: "wrap" }}>
          <div className="detail-title">
            {lead.name} {lead.company && <span>· {lead.company}</span>}
          </div>
          {/* key={status} remounts the pill on a status change so the flush pulse plays */}
          <StatusPill key={status} status={status} flush />
          {canEdit && (
            <div style={{ marginLeft: "auto" }}>
              <EditLeadDialog
                lead={{
                  id: lead.id,
                  name: lead.name,
                  phone: lead.phone,
                  email: lead.email,
                  company: lead.company,
                  source: lead.source,
                  dealValue: lead.dealValue,
                  notes: lead.notes,
                  budgetStatus: lead.budgetStatus,
                  authority: lead.authority,
                  timeline: lead.timeline,
                }}
                customSources={customSources}
              />
            </div>
          )}
        </div>

        {/* Four equal panels: info · status / activity · WhatsApp */}
        <div className="detail-grid">
          <div className="card">
            <div className="card-h">Lead info</div>
            <div className="card-b">
              <dl className="dl">
                <dt>Phone</dt>
                <dd className="tnum">{lead.phone}</dd>
                <dt>Email</dt>
                <dd>{lead.email ?? "—"}</dd>
                <dt>Company</dt>
                <dd>{lead.company ?? "—"}</dd>
                <dt>Source</dt>
                <dd>{sourceLabel(lead.source)}</dd>
                <dt>Deal value</dt>
                <dd className="tnum">{formatRM(lead.dealValue)}</dd>
                <dt>Fit score</dt>
                <dd>
                  <span className="tnum">{fit}</span>/100 · {fitVerdict}
                </dd>
                <dt>Budget</dt>
                <dd>{isBudgetStatus(lead.budgetStatus) ? BUDGET_LABELS[lead.budgetStatus] : "—"}</dd>
                <dt>Contact&apos;s role</dt>
                <dd>{isAuthority(lead.authority) ? AUTHORITY_LABELS[lead.authority] : "—"}</dd>
                <dt>Timeline</dt>
                <dd>{isTimeline(lead.timeline) ? TIMELINE_LABELS[lead.timeline] : "—"}</dd>
                {status === "LOST" && lead.lostReason && isLostReason(lead.lostReason) && (
                  <>
                    <dt>Lost because</dt>
                    <dd style={{ color: "#B23A34" }}>{LOST_REASON_LABELS[lead.lostReason]}</dd>
                  </>
                )}
                <dt>Assigned rep</dt>
                <dd>{lead.assignedTo?.name ?? "— Unassigned"}</dd>
                <dt>Created</dt>
                <dd>{new Date(lead.createdAt).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}</dd>
                {lead.notes && (
                  <>
                    <dt>Notes</dt>
                    <dd style={{ textAlign: "right" }}>{lead.notes}</dd>
                  </>
                )}
              </dl>

              {canAssign && (
                <form action={assignLead.bind(null, lead.id)} style={{ marginTop: 14 }}>
                  <div className="assign-row">
                    <Dropdown
                      name="userId"
                      compact
                      placeholder="Assign to a Sales Rep…"
                      ariaLabel="Assign to Sales Rep"
                      defaultValue={lead.assignedTo?.id ?? ""}
                      options={reps.map((r) => ({ value: r.id, label: r.name }))}
                    />
                    <button type="submit" className="btn btn-ghost">
                      Assign
                    </button>
                  </div>
                </form>
              )}

              {canDelete && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--mist-2)" }}>
                  <DeleteLeadButton leadId={lead.id} leadName={lead.name} />
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-h">Advance status</div>
            <div className="card-b">
              {canWork ? (
                <StatusAdvance leadId={lead.id} status={status} priorStatus={priorStatus} canReopen={canReopen} />
              ) : (
                <div style={{ color: "var(--slate)", fontSize: 13 }}>
                  Only the assigned Sales Rep (or a Manager/Admin) can change this lead&apos;s status.
                </div>
              )}
              {canEdit && !["WON", "LOST"].includes(status) && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--mist-2)" }}>
                  <FollowUpControl
                    leadId={lead.id}
                    nextFollowUpAt={lead.nextFollowUpAt ? lead.nextFollowUpAt.toISOString() : null}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-h">Activity</div>
            <div className="card-b scrolly">
              {canNote && <AddNoteForm action={addNote.bind(null, lead.id)} />}
              {lead.activities.length === 0 ? (
                <div style={{ color: "var(--slate)", fontSize: 13 }}>
                  No activity yet. Actions on this lead appear here.
                </div>
              ) : (
                <div className="timeline">
                  {lead.activities.map((a, i) => (
                    <div className={`tl${i === 0 ? " tl-new" : ""}`} key={a.id}>
                      <div className="tl-rail" />
                      <span className="tl-dot" style={{ background: ACTIVITY_COLOR[a.type as ActivityType] }} />
                      <div className="tl-body">
                        <div className="t">{a.detail}</div>
                        <div className="m">
                          {a.user.name} · {relativeTime(a.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-h">Contact via WhatsApp</div>
            <div className="card-b">
              {canWork ? (
                <WhatsAppPanel
                  leadId={lead.id}
                  phone={lead.phone}
                  leadName={lead.name}
                  company={lead.company}
                  repName={user.name}
                />
              ) : (
                <div style={{ color: "var(--slate)", fontSize: 13 }}>
                  Only the assigned Sales Rep (or a Manager/Admin) can contact this lead.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
