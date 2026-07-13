import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import {
  ACTIVE_STATUSES,
  LOST_REASONS,
  LOST_REASON_LABELS,
  sourceLabel,
  isLostReason,
} from "@/lib/domain";
import { avgSalesCycleDays, reachedAt } from "@/lib/velocity";
import { formatNumber } from "@/lib/format";
import Topbar from "@/components/Topbar";
import CountUp from "@/components/CountUp";

function isActive(status: string): boolean {
  return (ACTIVE_STATUSES as readonly string[]).includes(status);
}

const MONTH_FMT = new Intl.DateTimeFormat("en-MY", { month: "short" });

// Manager/Admin analytics: who is performing, why we lose, which sources pay,
// and how the months are trending. Everything is derived from the leads table
// and the activity audit trail — no extra tracking, no external tools.
export default async function ReportsPage() {
  const user = await requireUser();
  if (!can(user, "view_reports")) redirect("/dashboard");

  const [leads, reps] = await Promise.all([
    prisma.lead.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        source: true,
        dealValue: true,
        lostReason: true,
        assignedToId: true,
        createdAt: true,
        activities: {
          orderBy: { createdAt: "asc" },
          select: { type: true, detail: true, createdAt: true, userId: true },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: "SALES_REP" },
      select: { id: true, name: true, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const now = new Date();

  // ---- headline numbers ----
  const won = leads.filter((l) => l.status === "WON");
  const lost = leads.filter((l) => l.status === "LOST");
  const wonValue = won.reduce((s, l) => s + Number(l.dealValue), 0);
  const closed = won.length + lost.length;
  const winRate = closed > 0 ? Math.round((won.length / closed) * 100) : 0;

  const histories = leads.map((l) => ({
    createdAt: l.createdAt,
    changes: l.activities.filter((a) => a.type === "STATUS_CHANGE"),
  }));
  const salesCycle = avgSalesCycleDays(histories);

  // First-response time: assignment → the assigned rep's first touch on the lead
  // (WhatsApp, note, or status move). Computed per lead, averaged per rep.
  const WORK_TYPES = new Set(["WHATSAPP_CONTACT", "NOTE", "STATUS_CHANGE"]);
  const responseByRep = new Map<string, number[]>();
  for (const l of leads) {
    if (!l.assignedToId) continue;
    const assignedAt = l.activities.find((a) => a.type === "ASSIGNMENT")?.createdAt;
    if (!assignedAt) continue;
    const firstTouch = l.activities.find(
      (a) => a.userId === l.assignedToId && WORK_TYPES.has(a.type) && a.createdAt >= assignedAt
    );
    if (!firstTouch) continue;
    const hours = (firstTouch.createdAt.getTime() - assignedAt.getTime()) / 3_600_000;
    const list = responseByRep.get(l.assignedToId) ?? [];
    list.push(hours);
    responseByRep.set(l.assignedToId, list);
  }
  const allResponses = Array.from(responseByRep.values()).flat();
  const avgResponse =
    allResponses.length > 0 ? allResponses.reduce((a, b) => a + b, 0) / allResponses.length : null;
  const fmtHours = (h: number | null) =>
    h === null ? "—" : h < 1 ? "<1h" : h < 48 ? `${Math.round(h)}h` : `${(h / 24).toFixed(1)}d`;

  // ---- per-rep performance ----
  const repRows = reps.map((r) => {
    const mine = leads.filter((l) => l.assignedToId === r.id);
    const active = mine.filter((l) => isActive(l.status));
    const myWon = mine.filter((l) => l.status === "WON");
    const myLost = mine.filter((l) => l.status === "LOST");
    const myClosed = myWon.length + myLost.length;
    const responses = responseByRep.get(r.id) ?? [];
    return {
      ...r,
      openCount: active.length,
      pipeline: active.reduce((s, l) => s + Number(l.dealValue), 0),
      wonCount: myWon.length,
      wonValue: myWon.reduce((s, l) => s + Number(l.dealValue), 0),
      winRate: myClosed > 0 ? Math.round((myWon.length / myClosed) * 100) : null,
      response:
        responses.length > 0 ? responses.reduce((a, b) => a + b, 0) / responses.length : null,
    };
  });

  // ---- why we lose ----
  const lostByReason = LOST_REASONS.map((r) => ({
    reason: r,
    count: lost.filter((l) => l.lostReason === r).length,
  })).filter((x) => x.count > 0);
  const unexplainedLost = lost.filter((l) => !(l.lostReason && isLostReason(l.lostReason))).length;
  if (unexplainedLost > 0) {
    lostByReason.push({ reason: "OTHER", count: unexplainedLost });
  }
  lostByReason.sort((a, b) => b.count - a.count);
  const maxLost = Math.max(1, ...lostByReason.map((x) => x.count));

  // ---- where won value comes from (built-in and custom sources alike) ----
  const wonSources = Array.from(new Set(won.map((l) => l.source)));
  const sourceValue = wonSources
    .map((s) => {
      const wins = won.filter((l) => l.source === s);
      return { source: s, count: wins.length, value: wins.reduce((sum, l) => sum + Number(l.dealValue), 0) };
    })
    .sort((a, b) => b.value - a.value);
  const maxSourceValue = Math.max(1, ...sourceValue.map((x) => x.value));

  // ---- monthly outcomes (last 6 months, dated by the Won/Lost transition) ----
  const months: { key: string; label: string; wonValue: number; wonCount: number; lostValue: number; lostCount: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: MONTH_FMT.format(d),
      wonValue: 0, wonCount: 0, lostValue: 0, lostCount: 0,
    });
  }
  const monthOf = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  for (const l of leads) {
    const changes = l.activities.filter((a) => a.type === "STATUS_CHANGE");
    const wonAt = reachedAt(changes, "WON");
    const lostAt = reachedAt(changes, "LOST");
    // count the lead where it currently stands, dated by that transition
    if (l.status === "WON" && wonAt) {
      const m = months.find((x) => x.key === monthOf(wonAt));
      if (m) { m.wonValue += Number(l.dealValue); m.wonCount++; }
    } else if (l.status === "LOST" && lostAt) {
      const m = months.find((x) => x.key === monthOf(lostAt));
      if (m) { m.lostValue += Number(l.dealValue); m.lostCount++; }
    }
  }
  const maxMonth = Math.max(1, ...months.map((m) => Math.max(m.wonValue, m.lostValue)));

  return (
    <>
      <Topbar title="Reports" role={user.role} />
      <div className="content screen-in">
        {/* headline strip */}
        <div className="kpis">
          <div className="kpi">
            <div className="lbl">Won all-time</div>
            <div className="val tnum"><small>RM</small> <CountUp to={wonValue} comma /></div>
            <div className="delta" style={{ color: "var(--slate)" }}>{won.length} {won.length === 1 ? "deal" : "deals"}</div>
          </div>
          <div className="kpi">
            <div className="lbl">Win rate</div>
            <div className="val tnum"><CountUp to={winRate} /><small>%</small></div>
            <div className="delta" style={{ color: "var(--slate)" }}>of {closed} closed leads</div>
          </div>
          <div className="kpi">
            <div className="lbl">Avg sales cycle</div>
            <div className="val tnum">
              {salesCycle === null ? "—" : <><CountUp to={Math.round(salesCycle)} /><small>days</small></>}
            </div>
            <div className="delta" style={{ color: "var(--slate)" }}>created → won</div>
          </div>
          <div className="kpi">
            <div className="lbl">Avg first response</div>
            <div className="val tnum">{fmtHours(avgResponse)}</div>
            <div className="delta" style={{ color: "var(--slate)" }}>assignment → first touch</div>
          </div>
        </div>

        {/* rep performance */}
        <div className="section-head">
          <h2>Rep performance</h2>
          <span className="hint">response time from the activity log</span>
        </div>
        <div className="tbl-wrap">
          <table className="leads">
            <thead>
              <tr>
                <th>Sales Rep</th>
                <th className="r">Open leads</th>
                <th className="r">Pipeline</th>
                <th className="r">Won</th>
                <th className="r">Win rate</th>
                <th className="r">First response</th>
              </tr>
            </thead>
            <tbody>
              {repRows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="lead-name">
                      <Link href={`/leads?rep=${r.id}`}>{r.name}</Link>
                    </div>
                    {!r.isActive && <div className="lead-sub">Deactivated</div>}
                  </td>
                  <td className="r tnum">{r.openCount}</td>
                  <td className="r">
                    <span className="rm">RM</span>
                    <span className="tnum">{formatNumber(r.pipeline)}</span>
                  </td>
                  <td className="r">
                    <span className="rm">RM</span>
                    <span className="tnum">{formatNumber(r.wonValue)}</span>
                    <span className="lead-sub tnum"> · {r.wonCount}</span>
                  </td>
                  <td className="r tnum">{r.winRate === null ? "—" : `${r.winRate}%`}</td>
                  <td className="r tnum">{fmtHours(r.response)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="two-col">
          {/* why we lose */}
          <div className="card">
            <div className="card-h">Why we lose</div>
            <div className="card-b">
              {lostByReason.length === 0 ? (
                <div style={{ color: "var(--slate)", fontSize: 13 }}>
                  No lost leads yet — reasons are recorded whenever a lead is marked Lost.
                </div>
              ) : (
                lostByReason.map((x) => (
                  <div className="srcrow" key={x.reason}>
                    <div className="name">{LOST_REASON_LABELS[x.reason]}</div>
                    <div className="track">
                      <i style={{ width: `${(x.count / maxLost) * 100}%`, background: "var(--lost)", opacity: 0.5 }} />
                    </div>
                    <div className="c tnum">{x.count}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* where the won money came from */}
          <div className="card">
            <div className="card-h">Won value by source</div>
            <div className="card-b">
              {sourceValue.length === 0 ? (
                <div style={{ color: "var(--slate)", fontSize: 13 }}>Nothing won yet.</div>
              ) : (
                sourceValue.map((x) => (
                  <div className="srcrow src-wide" key={x.source}>
                    <div className="name">{sourceLabel(x.source)}</div>
                    <div className="track">
                      <i style={{ width: `${(x.value / maxSourceValue) * 100}%`, background: "var(--won)", opacity: 0.55 }} />
                    </div>
                    <div className="c tnum">
                      RM {formatNumber(x.value)} · {x.count}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* monthly outcomes */}
        <div className="section-head">
          <h2>Monthly outcomes</h2>
          <span className="hint">dated by the Won / Lost transition · bar width = RM</span>
        </div>
        <div className="pipeline">
          <div className="trend">
            {months.map((m) => (
              <div className="trend-month" key={m.key}>
                <div className="trend-lbl">{m.label}</div>
                <div className="trend-bars">
                  <div className="track">
                    <i style={{ width: `${(m.wonValue / maxMonth) * 100}%`, background: "var(--won)", opacity: 0.65 }} />
                  </div>
                  <div className="track">
                    <i style={{ width: `${(m.lostValue / maxMonth) * 100}%`, background: "var(--lost)", opacity: 0.5 }} />
                  </div>
                </div>
                <div className="trend-nums">
                  <span className="tnum" style={{ color: "#0F7147" }}>
                    {m.wonCount > 0 ? `RM ${formatNumber(m.wonValue)} · ${m.wonCount}` : "—"}
                  </span>
                  <span className="tnum" style={{ color: "#B23A34" }}>
                    {m.lostCount > 0 ? `RM ${formatNumber(m.lostValue)} · ${m.lostCount}` : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="legend" style={{ marginTop: 14 }}>
            <div><span style={{ background: "var(--won)" }} /><b>Won</b></div>
            <div><span style={{ background: "var(--lost)" }} /><b>Lost</b></div>
          </div>
        </div>
      </div>
    </>
  );
}
