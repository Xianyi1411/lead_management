import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { leadScopeWhere } from "@/lib/permissions";
import {
  ACTIVE_STATUSES,
  LEAD_STATUSES,
  LEAD_SOURCES,
  STATUS_LABELS,
  sourceLabel,
  isBudgetStatus,
  isAuthority,
  isTimeline,
  type ActivityType,
  type LeadStatus,
} from "@/lib/domain";
import { qualificationScore, temperatureScore } from "@/lib/scoring";
import { avgDaysInStage, stageConversion, avgSalesCycleDays } from "@/lib/velocity";
import { STATUS_UI, FUNNEL_ORDER } from "@/lib/status-ui";
import { formatNumber, relativeTime } from "@/lib/format";
import Topbar from "@/components/Topbar";
import CountUp from "@/components/CountUp";
import ScoreBadge from "@/components/ScoreBadge";

const ACTIVITY_COLOR: Record<ActivityType, string> = {
  CREATED: "var(--new)",
  ASSIGNMENT: "var(--iris)",
  WHATSAPP_CONTACT: "var(--wa)",
  STATUS_CHANGE: "var(--qualified)",
  NOTE: "var(--slate)",
  FOLLOW_UP: "var(--proposal)",
};

function isActive(status: string): boolean {
  return (ACTIVE_STATUSES as readonly string[]).includes(status);
}

/** One line in the Needs-attention queue, in priority order. */
interface AttentionItem {
  id: string;
  name: string;
  status: LeadStatus;
  kind: "overdue" | "today" | "idle";
  days: number; // overdue-by / idle-for days (0 for "today")
}

export default async function DashboardPage() {
  const user = await requireUser();
  const scope = leadScopeWhere(user);

  const leads = await prisma.lead.findMany({
    where: scope,
    select: {
      id: true,
      name: true,
      status: true,
      source: true,
      dealValue: true,
      budgetStatus: true,
      authority: true,
      timeline: true,
      nextFollowUpAt: true,
      createdAt: true,
      updatedAt: true,
      activities: {
        orderBy: { createdAt: "asc" },
        select: { type: true, detail: true, createdAt: true },
      },
    },
  });

  const recent = await prisma.activity.findMany({
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

  // ---- snapshot metrics (KPI strip, spectrum, sources) ----
  const now = new Date();
  const total = leads.length;
  const statusCount: Record<string, number> = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0]));
  const sourceCount: Record<string, number> = Object.fromEntries(LEAD_SOURCES.map((s) => [s, 0]));
  let pipelineValue = 0;
  let wonCount = 0;
  let wonThisMonthValue = 0;
  let wonThisMonthCount = 0;

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
  // Built-ins always show (zeros included); custom sources appear once used.
  const sourceKeys = Object.keys(sourceCount);
  const maxSource = Math.max(1, ...sourceKeys.map((s) => sourceCount[s]));
  const sources = sourceKeys
    .map((s) => ({ source: s, count: sourceCount[s] }))
    .sort((a, b) => b.count - a.count);

  // ---- velocity (lib/velocity.ts over the STATUS_CHANGE audit trail) ----
  const histories = leads.map((l) => ({
    createdAt: l.createdAt,
    changes: l.activities.filter((a) => a.type === "STATUS_CHANGE"),
  }));
  const stageDays = avgDaysInStage(histories, now);
  const conversions = stageConversion(histories, now);
  const salesCycle = avgSalesCycleDays(histories);
  const fmtDays = (d: number | undefined | null) =>
    d === undefined || d === null ? "—" : d < 1 ? "<1d" : `${d.toFixed(d < 10 ? 1 : 0)}d`;

  // ---- temperature + attention queue (lib/scoring.ts) ----
  const scored = leads.map((l) => {
    const fit = qualificationScore({
      budgetStatus: isBudgetStatus(l.budgetStatus) ? l.budgetStatus : "UNKNOWN",
      authority: isAuthority(l.authority) ? l.authority : "UNKNOWN",
      timeline: isTimeline(l.timeline) ? l.timeline : "UNKNOWN",
      source: l.source,
      dealValue: l.dealValue,
    });
    const lastActivityAt = l.activities[l.activities.length - 1]?.createdAt ?? null;
    const temp = temperatureScore({
      fitScore: fit,
      status: l.status as LeadStatus,
      lastActivityAt,
      nextFollowUpAt: l.nextFollowUpAt,
      now,
    });
    return { ...l, temp, lastActivityAt };
  });

  const hottest = scored
    .filter((l) => l.temp !== null)
    .sort((a, b) => (b.temp ?? 0) - (a.temp ?? 0))
    .slice(0, 5);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const attention: AttentionItem[] = [];
  for (const l of scored) {
    if (!isActive(l.status)) continue;
    const status = l.status as LeadStatus;
    if (l.nextFollowUpAt && l.nextFollowUpAt.getTime() < now.getTime() && !sameDay(l.nextFollowUpAt, now)) {
      attention.push({
        id: l.id, name: l.name, status,
        kind: "overdue",
        days: Math.max(1, Math.floor((now.getTime() - l.nextFollowUpAt.getTime()) / 86_400_000)),
      });
    } else if (l.nextFollowUpAt && sameDay(l.nextFollowUpAt, now)) {
      attention.push({ id: l.id, name: l.name, status, kind: "today", days: 0 });
    } else if (
      // idle = quiet for 7+ days AND no planned next step (a scheduled follow-up is a plan)
      !l.nextFollowUpAt &&
      (!l.lastActivityAt || now.getTime() - l.lastActivityAt.getTime() > 7 * 86_400_000)
    ) {
      attention.push({
        id: l.id, name: l.name, status,
        kind: "idle",
        days: l.lastActivityAt
          ? Math.floor((now.getTime() - l.lastActivityAt.getTime()) / 86_400_000)
          : Math.floor((now.getTime() - l.createdAt.getTime()) / 86_400_000),
      });
    }
  }
  const KIND_ORDER = { overdue: 0, today: 1, idle: 2 } as const;
  attention.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || b.days - a.days);

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

        {/* Velocity — computed from the status-change audit trail */}
        <div className="section-head">
          <h2>Velocity</h2>
          <span className="hint">
            avg sales cycle {salesCycle === null ? "—" : fmtDays(salesCycle)} · from the activity log
          </span>
        </div>
        <div className="pipeline velo">
          {conversions.map((step) => (
            <div className="velo-step" key={step.from}>
              <div className="velo-stage">
                <span className="dot" style={{ background: STATUS_UI[step.from].dot }} />
                <b>{STATUS_LABELS[step.from]}</b>
              </div>
              <div className="velo-days tnum">{fmtDays(stageDays[step.from])}</div>
              <div className="velo-sub">avg time in stage</div>
              <div className="velo-conv">
                <span className="tnum">
                  {step.rate === null ? "—" : `${Math.round(step.rate * 100)}%`}
                </span>{" "}
                advance to {STATUS_LABELS[step.to]} →
              </div>
            </div>
          ))}
        </div>

        <div className="two-col">
          {/* Needs attention — overdue follow-ups, due today, idle leads */}
          <div className="card">
            <div className="card-h">Needs attention</div>
            <div className="card-b">
              {attention.length === 0 ? (
                <div style={{ color: "var(--slate)", fontSize: 13 }}>
                  All clear — no overdue follow-ups and nothing idle. Schedule follow-ups on
                  leads so the next steps land here.
                </div>
              ) : (
                <div className="attn">
                  {attention.slice(0, 6).map((a) => (
                    <Link href={`/leads/${a.id}`} className="attn-row" key={a.id}>
                      <span className="dot" style={{ background: STATUS_UI[a.status].dot }} />
                      <span className="attn-name">{a.name}</span>
                      <span className="attn-stage">{STATUS_LABELS[a.status]}</span>
                      {a.kind === "overdue" && <span className="fu-flag">Overdue {a.days}d</span>}
                      {a.kind === "today" && <span className="fu-today">Due today</span>}
                      {a.kind === "idle" && <span className="fu-idle">Idle {a.days}d</span>}
                    </Link>
                  ))}
                  {attention.length > 6 && (
                    <Link href="/leads?focus=overdue" className="attn-more">
                      {attention.length - 6} more — open the leads list
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Hottest leads — work these first */}
          <div className="card">
            <div className="card-h">Hottest leads</div>
            <div className="card-b">
              {hottest.length === 0 ? (
                <div style={{ color: "var(--slate)", fontSize: 13 }}>
                  No active leads to rank yet.
                </div>
              ) : (
                <div className="attn">
                  {hottest.map((l, i) => (
                    <Link href={`/leads/${l.id}`} className="attn-row" key={l.id}>
                      <span className="hot-rank tnum">{i + 1}</span>
                      <span className="attn-name">{l.name}</span>
                      <ScoreBadge score={l.temp} />
                      <span className="attn-rm">
                        <span className="rm">RM</span>
                        <span className="tnum">{formatNumber(Number(l.dealValue))}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="two-col">
          {/* Source breakdown */}
          <div className="card">
            <div className="card-h">Source breakdown</div>
            <div className="card-b">
              {sources.map((s) => (
                <div className="srcrow" key={s.source}>
                  <div className="name">{sourceLabel(s.source)}</div>
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
              {recent.length === 0 ? (
                <div style={{ color: "var(--slate)", fontSize: 13 }}>
                  No activity yet. It appears here as leads are worked.
                </div>
              ) : (
                <div className="feed">
                  {recent.map((a, i) => (
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
