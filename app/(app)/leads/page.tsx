import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { leadScopeWhere } from "@/lib/permissions";
import {
  LEAD_STATUSES,
  LEAD_SOURCES,
  STATUS_LABELS,
  SOURCE_LABELS,
  isLeadStatus,
  isLeadSource,
  type LeadStatus,
} from "@/lib/domain";
import { formatNumber, relativeTime } from "@/lib/format";
import Topbar from "@/components/Topbar";
import StatusPill from "@/components/StatusPill";
import AddLeadDialog from "@/components/AddLeadDialog";

const REP_COLORS = ["#0E9AA7", "#D98A0B", "#2F6FED", "#17915B", "#4A45E0"];
function repColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return REP_COLORS[h % REP_COLORS.length];
}
function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

interface Filters {
  q?: string;
  status?: string;
  source?: string;
  rep?: string;
}

export default async function LeadsPage({ searchParams }: { searchParams: Filters }) {
  const user = (await getCurrentUser())!;
  const q = searchParams.q?.trim() || undefined;
  const status = searchParams.status && isLeadStatus(searchParams.status) ? searchParams.status : undefined;
  const source = searchParams.source && isLeadSource(searchParams.source) ? searchParams.source : undefined;
  const rep = searchParams.rep || undefined;

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

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      phone: true,
      company: true,
      status: true,
      dealValue: true,
      updatedAt: true,
      assignedTo: { select: { name: true } },
    },
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

  const hasFilters = !!(q || status || source || rep);

  return (
    <>
      <Topbar
        title="Leads"
        role={user.role}
        defaultQuery={q}
        action={<AddLeadDialog />}
      />
      <div className="content screen-in">
        <form className="filters" action="/leads" method="get">
          {q && <input type="hidden" name="q" value={q} />}
          <select className={`filter${status ? " on" : ""}`} name="status" defaultValue={status ?? ""} aria-label="Filter by status">
            <option value="">Status: All</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select className={`filter${source ? " on" : ""}`} name="source" defaultValue={source ?? ""} aria-label="Filter by source">
            <option value="">Source: All</option>
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABELS[s]}
              </option>
            ))}
          </select>
          {reps.length > 0 && (
            <select className={`filter${rep ? " on" : ""}`} name="rep" defaultValue={rep ?? ""} aria-label="Filter by assigned rep">
              <option value="">Rep: All</option>
              <option value="unassigned">Unassigned</option>
              {reps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
          <button type="submit" className="btn btn-soft" style={{ height: 34 }}>
            Apply filters
          </button>
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
                <th>Assigned rep</th>
                <th className="r">Deal value</th>
                <th>Last activity</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-cell">
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
