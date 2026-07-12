import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { leadScopeWhere } from "@/lib/permissions";
import {
  ACTIVE_STATUSES,
  LEAD_STATUSES,
  LEAD_SOURCES,
  SOURCE_LABELS,
  STATUS_LABELS,
  type ActivityType,
  type LeadStatus,
  type LeadSource,
} from "@/lib/domain";
import { STATUS_UI, FUNNEL_ORDER } from "@/lib/status-ui";
import { relativeTime } from "@/lib/format";
import Topbar from "@/components/Topbar";
import CountUp from "@/components/CountUp";

const ACTIVITY_COLOR: Record<ActivityType, string> = {
  CREATED: "var(--new)",
  ASSIGNMENT: "var(--iris)",
  WHATSAPP_CONTACT: "var(--wa)",
  STATUS_CHANGE: "var(--qualified)",
  NOTE: "var(--slate)",
};

function isActive(status: string): boolean {
  return (ACTIVE_STATUSES as readonly string[]).includes(status);
}

export default async function DashboardPage() {
  const user = (await getCurrentUser())!; // layout guarantees a user
  const scope = leadScopeWhere(user);

  const leads = await prisma.lead.findMany({
    where: scope,
    select: { status: true, dealValue: true, updatedAt: true, source: true },
  });

  const activities = await prisma.activity.findMany({
    where: { lead: scope },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      type: true,
      detail: true,
      createdAt: true,
      user: { select: { name: true } },
      lead: { select: { name: true } },
    },
  });

  // ---- metrics ----
  const total = leads.length;
  const statusCount: Record<string, number> = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0]));
  const sourceCount: Record<string, number> = Object.fromEntries(LEAD_SOURCES.map((s) => [s, 0]));
  let pipelineValue = 0;
  let wonCount = 0;
  let wonThisMonthValue = 0;
  let wonThisMonthCount = 0;

  const now = new Date();
  for (const l of leads) {
    statusCount[l.status] = (statusCount[l.status] ?? 0) + 1;
    sourceCount[l.source] = (sourceCount[l.source] ?? 0) + 1;
    const value = Number(l.dealValue);
    if (isActive(l.status)) pipelineValue += value;
    if (l.status === "WON") {
      wonCount++;
      const d = new Date(l.updatedAt);
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        wonThisMonthValue += value;
        wonThisMonthCount++;
      }
    }
  }
  const activeCount = LEAD_STATUSES.filter(isActive).reduce((n, s) => n + statusCount[s], 0);
  const conversion = total > 0 ? Math.round((wonCount / total) * 100) : 0;

  const funnel = FUNNEL_ORDER.map((s) => ({ status: s as LeadStatus, count: statusCount[s] }));
  const maxSource = Math.max(1, ...LEAD_SOURCES.map((s) => sourceCount[s]));
  const sources = (LEAD_SOURCES as readonly LeadSource[])
    .map((s) => ({ source: s, count: sourceCount[s] }))
    .sort((a, b) => b.count - a.count);

  return (
    <>
      <Topbar title="Dashboard" role={user.role} />
      <div className="content screen-in">
        {/* KPI strip */}
        <div className="kpis">
          <div className="kpi">
            <div className="lbl">Total leads</div>
            <div className="val tnum"><CountUp to={total} comma /></div>
            <div className="delta" style={{ color: "var(--slate)" }}>{activeCount} active</div>
          </div>
          <div className="kpi">
            <div className="lbl">Pipeline value</div>
            <div className="val tnum"><small>RM</small> <CountUp to={pipelineValue} comma /></div>
            <div className="delta" style={{ color: "var(--slate)" }}>across {activeCount} active leads</div>
          </div>
          <div className="kpi">
            <div className="lbl">Won this month</div>
            <div className="val tnum"><small>RM</small> <CountUp to={wonThisMonthValue} comma /></div>
            <div className="delta" style={{ color: "var(--slate)" }}>{wonThisMonthCount} {wonThisMonthCount === 1 ? "deal" : "deals"}</div>
          </div>
          <div className="kpi">
            <div className="lbl">Conversion rate</div>
            <div className="val tnum"><CountUp to={conversion} /><small>%</small></div>
            <div className="delta" style={{ color: "var(--slate)" }}>{wonCount} of {total} leads</div>
          </div>
        </div>

        {/* Pipeline spectrum */}
        <div className="section-head">
          <h2>The pipeline</h2>
          <span className="hint">{total} leads · width = count</span>
        </div>
        <div className="pipeline">
          <div className="spectrum">
            {funnel
              .filter((f) => f.count > 0)
              .map((f) => (
                <div
                  key={f.status}
                  className="seg"
                  style={{ flexGrow: f.count, background: STATUS_UI[f.status].dot }}
                  title={`${STATUS_LABELS[f.status]} — ${f.count}`}
                >
                  <span className="tnum">{f.count}</span>
                </div>
              ))}
          </div>
          <div className="legend">
            {funnel.map((f) => (
              <div key={f.status}>
                <span style={{ background: STATUS_UI[f.status].dot }} />
                <b>{STATUS_LABELS[f.status]}</b>&nbsp;<small className="tnum">{f.count}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="two-col">
          {/* Source breakdown */}
          <div className="card">
            <div className="card-h">Source breakdown</div>
            <div className="card-b">
              {sources.map((s) => (
                <div className="srcrow" key={s.source}>
                  <div className="name">{SOURCE_LABELS[s.source]}</div>
                  <div className="track">
                    <i style={{ width: `${(s.count / maxSource) * 100}%` }} />
                  </div>
                  <div className="c tnum">{s.count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div className="card">
            <div className="card-h">Recent activity</div>
            <div className="card-b">
              {activities.length === 0 ? (
                <div style={{ color: "var(--slate)", fontSize: 13 }}>
                  No activity yet. It appears here as leads are worked.
                </div>
              ) : (
                <div className="feed">
                  {activities.map((a, i) => (
                    <div className="feeditem" key={i}>
                      <span className="dot" style={{ background: ACTIVITY_COLOR[a.type as ActivityType] }} />
                      <div>
                        <div className="t"><b>{a.lead.name}</b> · {a.detail}</div>
                        <div className="when">{a.user.name} · {relativeTime(a.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
