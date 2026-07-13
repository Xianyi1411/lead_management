import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { leadScopeWhere } from "@/lib/permissions";
import {
  LEAD_STATUSES,
  LEAD_SOURCES,
  STATUS_LABELS,
  SOURCE_LABELS,
  ACTIVE_STATUSES,
  isLeadStatus,
  isLeadSource,
  isBudgetStatus,
  isAuthority,
  isTimeline,
  type LeadStatus,
} from "@/lib/domain";
import { qualificationScore, temperatureScore } from "@/lib/scoring";
import { formatNumber, relativeTime } from "@/lib/format";
import Topbar from "@/components/Topbar";
import StatusPill from "@/components/StatusPill";
import ScoreBadge from "@/components/ScoreBadge";
import AddLeadDialog from "@/components/AddLeadDialog";
import Dropdown from "@/components/Dropdown";

const REP_COLORS = ["#0E9AA7", "#D98A0B", "#2F6FED", "#17915B", "#4A45E0"];
function repColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return REP_COLORS[h % REP_COLORS.length];
}
function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const FOCUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "overdue", label: "Overdue follow-up" },
  { value: "today", label: "Due today" },
  { value: "idle", label: "Idle 7+ days" },
  { value: "hot", label: "Hot leads" },
] as const;
type Focus = (typeof FOCUS_OPTIONS)[number]["value"];

interface Filters {
  q?: string;
  status?: string;
  source?: string;
  rep?: string;
  focus?: string;
}

export default async function LeadsPage({ searchParams }: { searchParams: Filters }) {
  const user = await requireUser();
  const customSources = (
    await prisma.customSource.findMany({ select: { name: true }, orderBy: { name: "asc" } })
  ).map((s) => s.name);
  const q = searchParams.q?.trim() || undefined;
  const status = searchParams.status && isLeadStatus(searchParams.status) ? searchParams.status : undefined;
  const source =
    searchParams.source &&
    (isLeadSource(searchParams.source) || customSources.includes(searchParams.source))
      ? searchParams.source
      : undefined;
  const rep = searchParams.rep || undefined;
  const focus: Focus = (FOCUS_OPTIONS.some((o) => o.value === searchParams.focus)
    ? searchParams.focus
    : "") as Focus;

  const where = {
    ...leadScopeWhere(user),
    ...(status ? { status } : {}),
    ...(source ? { source } : {}),
    ...(rep ? (rep === "unassigned" ? { assignedToId: null } : { assignedToId: rep }) : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { phone: { contains: q } },
            { company: { contains: q } },
          ],
        }
      : {}),
  };

  const rows = await prisma.lead.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      phone: true,
      company: true,
      status: true,
      source: true,
      dealValue: true,
      budgetStatus: true,
      authority: true,
      timeline: true,
      nextFollowUpAt: true,
      updatedAt: true,
      assignedTo: { select: { name: true } },
      activities: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
  });

  // Fit + temperature per lead (pure rule — lib/scoring.ts), then the Focus lens.
  const now = new Date();
  const isActiveStatus = (s: string) => (ACTIVE_STATUSES as readonly string[]).includes(s);
  const scored = rows.map((l) => {
    const fit = qualificationScore({
      budgetStatus: isBudgetStatus(l.budgetStatus) ? l.budgetStatus : "UNKNOWN",
      authority: isAuthority(l.authority) ? l.authority : "UNKNOWN",
      timeline: isTimeline(l.timeline) ? l.timeline : "UNKNOWN",
      source: l.source,
      dealValue: l.dealValue,
    });
    const temp = temperatureScore({
      fitScore: fit,
      status: l.status as LeadStatus,
      lastActivityAt: l.activities[0]?.createdAt ?? null,
      nextFollowUpAt: l.nextFollowUpAt,
      now,
    });
    return { ...l, temp };
  });

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const leads = scored.filter((l) => {
    switch (focus) {
      case "overdue":
        return (
          isActiveStatus(l.status) &&
          !!l.nextFollowUpAt &&
          l.nextFollowUpAt.getTime() < now.getTime() &&
          !sameDay(l.nextFollowUpAt, now) // due-today lives under "today", not "overdue"
        );
      case "today":
        return isActiveStatus(l.status) && !!l.nextFollowUpAt && sameDay(l.nextFollowUpAt, now);
      case "idle": {
        // idle = quiet for 7+ days AND no planned next step (a scheduled follow-up is a plan)
        if (!isActiveStatus(l.status) || l.nextFollowUpAt) return false;
        const last = l.activities[0]?.createdAt;
        return !last || now.getTime() - last.getTime() > 7 * 86_400_000;
      }
      case "hot":
        return l.temp !== null && l.temp >= 70;
      default:
        return true;
    }
  });

  // Rep filter options only make sense for Manager/Admin (a Rep sees only their own).
  const reps =
    user.role === "SALES_REP"
      ? []
      : await prisma.user.findMany({
          where: { role: "SALES_REP", isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        });

  const hasFilters = !!(q || status || source || rep || focus);

  return (
    <>
      <Topbar
        title="Leads"
        role={user.role}
        defaultQuery={q}
        action={<AddLeadDialog customSources={customSources} />}
      />
      <div className="content screen-in">
        {/* Picking an option submits the form immediately (submitOnChange). */}
        <form className="filters" action="/leads" method="get">
          {q && <input type="hidden" name="q" value={q} />}
          <Dropdown
            name="status"
            variant="filter"
            prefix="Status"
            submitOnChange
            active={!!status}
            ariaLabel="Filter by status"
            defaultValue={status ?? ""}
            options={[
              { value: "", label: "All" },
              ...LEAD_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
            ]}
          />
          <Dropdown
            name="source"
            variant="filter"
            prefix="Source"
            submitOnChange
            active={!!source}
            ariaLabel="Filter by source"
            defaultValue={source ?? ""}
            options={[
              { value: "", label: "All" },
              ...LEAD_SOURCES.map((s) => ({ value: s, label: SOURCE_LABELS[s] })),
              ...customSources.map((n) => ({ value: n, label: n })),
            ]}
          />
          {reps.length > 0 && (
            <Dropdown
              name="rep"
              variant="filter"
              prefix="Rep"
              submitOnChange
              active={!!rep}
              ariaLabel="Filter by assigned rep"
              defaultValue={rep ?? ""}
              options={[
                { value: "", label: "All" },
                { value: "unassigned", label: "Unassigned" },
                ...reps.map((r) => ({ value: r.id, label: r.name })),
              ]}
            />
          )}
          <Dropdown
            name="focus"
            variant="filter"
            prefix="Focus"
            submitOnChange
            active={!!focus}
            ariaLabel="Focus on leads needing attention"
            defaultValue={focus}
            options={[...FOCUS_OPTIONS]}
          />
          {hasFilters && (
            <Link href="/leads" className="filter-clear">
              Clear
            </Link>
          )}
          <div className="spacer" />
          <span className="filter" style={{ border: "none", background: "transparent" }}>
            <b className="tnum">{leads.length}</b>&nbsp;{leads.length === 1 ? "lead" : "leads"}
          </span>
        </form>

        <div className="tbl-wrap">
          <table className="leads">
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Status</th>
                <th>Fit</th>
                <th>Assigned rep</th>
                <th className="r">Deal value</th>
                <th>Follow-up</th>
                <th>Last activity</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-cell">
                    {hasFilters ? (
                      <>No leads match these filters. <Link href="/leads">Clear them</Link>, or use <b>New lead</b> above.</>
                    ) : (
                      <>No leads yet. Use <b>New lead</b> above to start the pipeline.</>
                    )}
                  </td>
                </tr>
              ) : (
                leads.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <div className="lead-name">
                        <Link href={`/leads/${l.id}`}>{l.name}</Link>
                      </div>
                      <div className="lead-sub tnum">{l.phone}</div>
                    </td>
                    <td>{l.company ?? "—"}</td>
                    <td>
                      <StatusPill status={l.status as LeadStatus} />
                    </td>
                    <td>
                      <ScoreBadge score={l.temp} />
                    </td>
                    <td>
                      {l.assignedTo ? (
                        <span className="rep">
                          <span className="avatar" style={{ background: repColor(l.assignedTo.name) }}>
                            {initials(l.assignedTo.name)}
                          </span>
                          {l.assignedTo.name}
                        </span>
                      ) : (
                        <span className="unassigned">— Unassigned</span>
                      )}
                    </td>
                    <td className="r">
                      <span className="rm">RM</span>
                      <span className="tnum">{formatNumber(Number(l.dealValue))}</span>
                    </td>
                    <td className="muted-time">
                      {l.nextFollowUpAt && isActiveStatus(l.status) ? (
                        sameDay(l.nextFollowUpAt, now) ? (
                          <span className="fu-today">Due today</span>
                        ) : l.nextFollowUpAt.getTime() < now.getTime() ? (
                          <span className="fu-flag">
                            Overdue{" "}
                            {Math.max(1, Math.floor((now.getTime() - l.nextFollowUpAt.getTime()) / 86_400_000))}d
                          </span>
                        ) : (
                          l.nextFollowUpAt.toLocaleDateString("en-MY", { day: "numeric", month: "short" })
                        )
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="muted-time">{relativeTime(l.updatedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
