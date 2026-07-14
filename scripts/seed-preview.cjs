// Diagnostic: read from the seeded dev DB and print what the demo screens
// will actually show (KPI counters, monthly outcomes, pipeline forecast).
// Kept as a script so future seed changes can re-run this: node scripts/seed-preview.cjs.

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

async function main() {
  const now = new Date();
  const leads = await prisma.lead.findMany({
    select: {
      id: true, name: true, status: true, source: true, dealValue: true,
      expectedCloseAt: true, createdAt: true, updatedAt: true, lostReason: true,
      assignedToId: true, activities: { orderBy: { createdAt: "asc" } },
    },
  });
  const users = await prisma.user.findMany({ select: { id: true, name: true, role: true } });
  const nameOf = (id) => users.find((u) => u.id === id)?.name ?? "—";

  const wins = leads.filter((l) => l.status === "WON");
  const lost = leads.filter((l) => l.status === "LOST");
  const active = leads.filter((l) => !["WON", "LOST"].includes(l.status));

  console.log(`\n=== TOTALS ===`);
  console.log(`  ${leads.length} leads · ${wins.length} won · ${lost.length} lost · ${active.length} active`);
  console.log(`  All-time won: RM ${wins.reduce((s, l) => s + l.dealValue, 0).toLocaleString()}`);
  console.log(`  Active pipeline: RM ${active.reduce((s, l) => s + l.dealValue, 0).toLocaleString()}`);

  // ---- Monthly outcomes for the last 6 months (Reports "Monthly outcomes") ----
  console.log(`\n=== MONTHLY OUTCOMES (last 6 months, dated by Won/Lost transition) ===`);
  const bucket = new Map(); // "YYYY-M" -> {wonN, wonR, lostN, lostR}
  for (const l of leads) {
    const changes = l.activities.filter((a) => a.type === "STATUS_CHANGE");
    const wonRow = changes.find((c) => c.detail.includes("→ Won"));
    const lostRow = changes.find((c) => c.detail.includes("→ Lost"));
    let key = null, isWin = false;
    if (l.status === "WON" && wonRow) { key = `${wonRow.createdAt.getFullYear()}-${wonRow.createdAt.getMonth()}`; isWin = true; }
    else if (l.status === "LOST" && lostRow) { key = `${lostRow.createdAt.getFullYear()}-${lostRow.createdAt.getMonth()}`; }
    if (!key) continue;
    if (!bucket.has(key)) bucket.set(key, { wonN: 0, wonR: 0, lostN: 0, lostR: 0 });
    const b = bucket.get(key);
    if (isWin) { b.wonN++; b.wonR += l.dealValue; } else { b.lostN++; b.lostR += l.dealValue; }
  }
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const b = bucket.get(key) ?? { wonN: 0, wonR: 0, lostN: 0, lostR: 0 };
    console.log(`  ${MONTH[d.getMonth()]} ${d.getFullYear()}: won ${b.wonN} (RM ${b.wonR.toLocaleString()}), lost ${b.lostN} (RM ${b.lostR.toLocaleString()})`);
  }

  // ---- Pipeline forecast (next 3 months + Later + No date) ----
  console.log(`\n=== PIPELINE FORECAST (active leads by expected purchase date) ===`);
  const fc = [{ label: "this month" }, { label: "+1 month" }, { label: "+2 months" }];
  const later = active.filter((l) => l.expectedCloseAt && l.expectedCloseAt >= new Date(now.getFullYear(), now.getMonth() + 3, 1));
  const noDate = active.filter((l) => !l.expectedCloseAt);
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    const b = active.filter((l) => l.expectedCloseAt && l.expectedCloseAt >= d && l.expectedCloseAt < next);
    console.log(`  ${MONTH[d.getMonth()]} ${d.getFullYear()} (${fc[i].label}): ${b.length} leads, RM ${b.reduce((s, l) => s + l.dealValue, 0).toLocaleString()}`);
  }
  console.log(`  Later:    ${later.length} leads, RM ${later.reduce((s, l) => s + l.dealValue, 0).toLocaleString()}`);
  console.log(`  No date:  ${noDate.length} leads, RM ${noDate.reduce((s, l) => s + l.dealValue, 0).toLocaleString()}`);

  // ---- Rep performance ----
  console.log(`\n=== REP PERFORMANCE ===`);
  const reps = users.filter((u) => u.role === "SALES_REP");
  for (const r of reps) {
    const mine = leads.filter((l) => l.assignedToId === r.id);
    const won = mine.filter((l) => l.status === "WON");
    const lost = mine.filter((l) => l.status === "LOST");
    const openLeads = mine.filter((l) => !["WON", "LOST"].includes(l.status));
    const winRate = (won.length + lost.length) > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
    console.log(`  ${r.name}: open ${openLeads.length}, pipeline RM ${openLeads.reduce((s, l) => s + l.dealValue, 0).toLocaleString()}, won ${won.length} (RM ${won.reduce((s, l) => s + l.dealValue, 0).toLocaleString()}), win rate ${winRate}%`);
  }

  // ---- Why we lose ----
  console.log(`\n=== LOST REASONS ===`);
  const reasons = {};
  for (const l of lost) reasons[l.lostReason ?? "UNKNOWN"] = (reasons[l.lostReason ?? "UNKNOWN"] ?? 0) + 1;
  for (const [r, n] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${r}: ${n}`);
  }

  // ---- Won by source ----
  console.log(`\n=== WON VALUE BY SOURCE ===`);
  const bySource = {};
  for (const l of wins) {
    bySource[l.source] = (bySource[l.source] ?? { n: 0, r: 0 });
    bySource[l.source].n++; bySource[l.source].r += l.dealValue;
  }
  for (const [s, v] of Object.entries(bySource).sort((a, b) => b[1].r - a[1].r)) {
    console.log(`  ${s}: ${v.n} deals, RM ${v.r.toLocaleString()}`);
  }

  // ---- Sales cycle (avg days created → won) ----
  const cycles = [];
  for (const l of wins) {
    const wonRow = l.activities.find((a) => a.detail.includes("→ Won"));
    if (wonRow) cycles.push((wonRow.createdAt.getTime() - l.createdAt.getTime()) / 86_400_000);
  }
  if (cycles.length) {
    const avg = cycles.reduce((a, b) => a + b, 0) / cycles.length;
    const min = Math.min(...cycles), max = Math.max(...cycles);
    console.log(`\n=== SALES CYCLE ===\n  ${wins.length} won deals, avg ${avg.toFixed(1)} days (min ${min.toFixed(0)}d, max ${max.toFixed(0)}d)`);
  }
}

main().finally(() => prisma.$disconnect());
