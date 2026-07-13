// Generates three companion slides — Database ERD, System architecture,
// Project structure — in the exact design language of the existing
// XeersLead-presentation.pptx (widescreen 16:9, tokens from DESIGN.md §2).
//
// Output: presentation/XeersLead-architecture-slides.pptx (3 slides).
// The user can then Insert → Reuse Slides in PowerPoint to merge them into
// the main deck at whichever positions they want.
//
// Run: node scripts/build-architecture-slides.cjs

const path = require("path");
const PptxGenJS = require("pptxgenjs");

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE"; // 13.333 × 7.5 inches — matches the existing deck.
pptx.title = "Leadway — architecture supplement";
pptx.company = "Leadway";

// --- Tokens (identical to DESIGN.md §2 + globals.css) --------------------
const C = {
  fog: "F7F8FA",
  surface: "FFFFFF",
  ink: "1C1F27",
  slate: "5B6170",
  mist: "E6E8EE",
  mist2: "EEF0F4",
  iris: "4A45E0",
  irisSoft: "ECEBFB",
  // Pipeline spectrum (used as accents for the ERD tables)
  ct: "2F6FED", qu: "0E9AA7", pr: "D98A0B", wn: "17915B",
};
const FONT = "Calibri"; // matches the existing deck's typeface

// --- Slide-level helpers -------------------------------------------------
function baseSlide(title, eyebrow) {
  const s = pptx.addSlide();
  s.background = { color: C.fog };

  // Iris accent bar (identity strip along the top edge)
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 13.333, h: 0.08, fill: { color: C.iris }, line: { type: "none" },
  });

  // Uppercase eyebrow
  s.addText(eyebrow, {
    x: 0.5, y: 0.35, w: 12, h: 0.3,
    fontFace: FONT, fontSize: 11, bold: true, color: C.slate, charSpacing: 3,
  });

  // Slide title
  s.addText(title, {
    x: 0.5, y: 0.65, w: 12, h: 0.6,
    fontFace: FONT, fontSize: 26, bold: true, color: C.ink,
  });

  // Divider under the title
  s.addShape(pptx.ShapeType.rect, {
    x: 0.5, y: 1.28, w: 12.33, h: 0.02, fill: { color: C.mist }, line: { type: "none" },
  });

  // Footer wordmark
  s.addText("Leadway  ·  Lead management platform", {
    x: 0.5, y: 7.15, w: 12.33, h: 0.25,
    fontFace: FONT, fontSize: 9, color: C.slate,
  });
  return s;
}

// A "card" — bordered surface panel used across the ERD and architecture slides.
function card(s, { x, y, w, h, title, accent }) {
  s.addShape(pptx.ShapeType.rect, {
    x, y, w, h, fill: { color: C.surface },
    line: { color: C.mist, width: 0.75 }, rectRadius: 0.08,
  });
  if (accent) {
    s.addShape(pptx.ShapeType.rect, {
      x, y, w, h: 0.12, fill: { color: accent }, line: { type: "none" },
      rectRadius: 0.08,
    });
  }
  if (title) {
    s.addText(title, {
      x: x + 0.18, y: y + 0.16, w: w - 0.36, h: 0.36,
      fontFace: FONT, fontSize: 12, bold: true, color: C.ink, charSpacing: 1.2,
    });
  }
}

function fieldRow(s, { x, y, w, name, type, isKey, isFK, isNew }) {
  const nameColor = isKey ? C.iris : C.ink;
  const badge = isKey ? "PK" : isFK ? "FK" : "";
  s.addText(name, {
    x: x + 0.12, y, w: w * 0.5, h: 0.28,
    fontFace: FONT, fontSize: 10.5, bold: isKey, color: nameColor,
  });
  s.addText(type, {
    x: x + w * 0.5, y, w: w * 0.42, h: 0.28,
    fontFace: FONT, fontSize: 9.5, italic: true, color: C.slate,
    align: "right",
  });
  if (badge) {
    s.addShape(pptx.ShapeType.rect, {
      x: x + w - 0.38, y: y + 0.03, w: 0.28, h: 0.22,
      fill: { color: isKey ? C.iris : C.mist2 }, line: { type: "none" }, rectRadius: 0.04,
    });
    s.addText(badge, {
      x: x + w - 0.38, y: y + 0.02, w: 0.28, h: 0.24,
      fontFace: FONT, fontSize: 8, bold: true,
      color: isKey ? "FFFFFF" : C.slate, align: "center",
    });
  }
  if (isNew) {
    // "new in Phase 2" iris dot
    s.addShape(pptx.ShapeType.ellipse, {
      x: x + 0.02, y: y + 0.09, w: 0.08, h: 0.08,
      fill: { color: C.iris }, line: { type: "none" },
    });
  }
}

// A connector line with a small arrow head at the target end (relationships).
function line(s, x1, y1, x2, y2, label) {
  s.addShape(pptx.ShapeType.line, {
    x: x1, y: y1, w: x2 - x1, h: y2 - y1,
    line: { color: C.slate, width: 1.25, endArrowType: "triangle" },
  });
  if (label) {
    const mx = (x1 + x2) / 2 - 0.5;
    const my = (y1 + y2) / 2 - 0.14;
    s.addShape(pptx.ShapeType.rect, {
      x: mx, y: my, w: 1.0, h: 0.24,
      fill: { color: C.fog }, line: { color: C.mist, width: 0.5 }, rectRadius: 0.04,
    });
    s.addText(label, {
      x: mx, y: my, w: 1.0, h: 0.24,
      fontFace: FONT, fontSize: 8.5, color: C.slate, align: "center",
    });
  }
}

// ---------------------------------------------------------------------------
// Slide 1 · Database ERD
// ---------------------------------------------------------------------------
function slideERD() {
  const s = baseSlide(
    "Database ERD",
    "SLIDE  ·  SYSTEM DESIGN"
  );

  // Sub-caption
  s.addText(
    "Five tables · Prisma is the source of truth · every mutation writes an Activity row (audit trail)",
    { x: 0.5, y: 1.35, w: 12.33, h: 0.3, fontFace: FONT, fontSize: 12, color: C.slate }
  );

  // -------- Layout: 3 core entities across the top, 2 support at the bottom --
  // User (top-left)
  const userX = 0.5, userY = 1.85, userW = 3.0, userH = 2.3;
  card(s, { x: userX, y: userY, w: userW, h: userH, title: "USER", accent: C.iris });
  const userFields = [
    { name: "id", type: "String", isKey: true },
    { name: "name", type: "String" },
    { name: "email", type: "String (unique)" },
    { name: "passwordHash", type: "String" },
    { name: "role", type: "Role enum" },
    { name: "isActive", type: "Boolean" },
    { name: "createdAt", type: "DateTime" },
  ];
  userFields.forEach((f, i) => fieldRow(s, { x: userX, y: userY + 0.6 + i * 0.24, w: userW, ...f }));

  // Lead (top-centre) — the big one
  const leadX = 4.8, leadY = 1.85, leadW = 3.9, leadH = 4.9;
  card(s, { x: leadX, y: leadY, w: leadW, h: leadH, title: "LEAD", accent: C.qu });
  const leadFields = [
    { name: "id", type: "String", isKey: true },
    { name: "name", type: "String" },
    { name: "phone", type: "String" },
    { name: "email", type: "String?" },
    { name: "company", type: "String?" },
    { name: "source", type: "String (LeadSource / custom)" },
    { name: "status", type: "LeadStatus enum" },
    { name: "dealValue", type: "Int (RM)" },
    { name: "notes", type: "String?" },
    { name: "budgetStatus", type: "BudgetStatus", isNew: true },
    { name: "authority", type: "Authority", isNew: true },
    { name: "timeline", type: "Timeline", isNew: true },
    { name: "budgetAmount", type: "Int? (RM)", isNew: true },
    { name: "expectedCloseAt", type: "DateTime?", isNew: true },
    { name: "nextFollowUpAt", type: "DateTime?", isNew: true },
    { name: "lostReason", type: "LostReason?", isNew: true },
    { name: "assignedToId", type: "String? → User", isFK: true },
    { name: "createdById", type: "String → User", isFK: true },
  ];
  leadFields.forEach((f, i) => fieldRow(s, { x: leadX, y: leadY + 0.55 + i * 0.235, w: leadW, ...f }));

  // Activity (top-right)
  const actX = 9.85, actY = 1.85, actW = 2.98, actH = 2.3;
  card(s, { x: actX, y: actY, w: actW, h: actH, title: "ACTIVITY", accent: C.pr });
  const actFields = [
    { name: "id", type: "String", isKey: true },
    { name: "leadId", type: "String → Lead", isFK: true },
    { name: "userId", type: "String → User", isFK: true },
    { name: "type", type: "ActivityType" },
    { name: "detail", type: "String" },
    { name: "createdAt", type: "DateTime" },
  ];
  actFields.forEach((f, i) => fieldRow(s, { x: actX, y: actY + 0.6 + i * 0.24, w: actW, ...f }));

  // -------- Support tables (bottom-right) -----------------------------------
  const csX = 9.85, csY = 4.4, csW = 2.98, csH = 1.1;
  card(s, { x: csX, y: csY, w: csW, h: csH, title: "CUSTOM_SOURCE", accent: C.ct });
  s.addText("id · name (unique) · createdAt", {
    x: csX + 0.15, y: csY + 0.5, w: csW - 0.3, h: 0.5,
    fontFace: FONT, fontSize: 10, color: C.ink,
  });
  s.addText("Team-added lead sources beyond the 6 built-ins", {
    x: csX + 0.15, y: csY + 0.75, w: csW - 0.3, h: 0.28,
    fontFace: FONT, fontSize: 9, italic: true, color: C.slate,
  });

  const mtX = 9.85, mtY = 5.6, mtW = 2.98, mtH = 1.15;
  card(s, { x: mtX, y: mtY, w: mtW, h: mtH, title: "MESSAGE_TEMPLATE", accent: C.ct });
  s.addText("id · label (unique) · body · roles (CSV)", {
    x: mtX + 0.15, y: mtY + 0.5, w: mtW - 0.3, h: 0.28,
    fontFace: FONT, fontSize: 10, color: C.ink,
  });
  s.addText("Editable WhatsApp templates, role-scoped", {
    x: mtX + 0.15, y: mtY + 0.75, w: mtW - 0.3, h: 0.28,
    fontFace: FONT, fontSize: 9, italic: true, color: C.slate,
  });

  // -------- Relationships ---------------------------------------------------
  // User → Lead (both relations)
  line(s, userX + userW, userY + 1.0, leadX, leadY + 1.6, "1 : *  (assignedTo)");
  line(s, userX + userW, userY + 1.7, leadX, leadY + 3.5, "1 : *  (createdBy)");
  // Lead → Activity
  line(s, leadX + leadW, leadY + 1.5, actX, actY + 0.9, "1 : *  timeline");
  // User → Activity
  line(s, userX + userW * 0.5, userY + userH, userX + userW * 0.5, 6.4, "");
  line(s, userX + userW * 0.5, 6.4, actX, actY + 1.4, "1 : *");

  // -------- Legend ----------------------------------------------------------
  const lgX = 0.5, lgY = 6.4;
  s.addShape(pptx.ShapeType.ellipse, {
    x: lgX, y: lgY + 0.06, w: 0.14, h: 0.14, fill: { color: C.iris }, line: { type: "none" },
  });
  s.addText("Added / evolved in Phase 2 (§14)", {
    x: lgX + 0.2, y: lgY, w: 3.5, h: 0.28,
    fontFace: FONT, fontSize: 10, color: C.slate,
  });
  s.addShape(pptx.ShapeType.rect, {
    x: lgX, y: lgY + 0.42, w: 0.28, h: 0.22, fill: { color: C.iris }, line: { type: "none" }, rectRadius: 0.04,
  });
  s.addText("PK", {
    x: lgX, y: lgY + 0.4, w: 0.28, h: 0.24,
    fontFace: FONT, fontSize: 8, bold: true, color: "FFFFFF", align: "center",
  });
  s.addText("primary key   ·   FK badge on a foreign-key column", {
    x: lgX + 0.36, y: lgY + 0.4, w: 4.2, h: 0.28,
    fontFace: FONT, fontSize: 10, color: C.slate,
  });
}

// ---------------------------------------------------------------------------
// Slide 2 · How the system works (deliberately non-technical — for executives)
// ---------------------------------------------------------------------------
function slideArchitecture() {
  const s = baseSlide(
    "How the system works",
    "SLIDE  ·  A LOOK UNDER THE HOOD"
  );
  s.addText(
    "Three groups of people. One app. One clear record of what happened.",
    { x: 0.5, y: 1.35, w: 12.33, h: 0.3, fontFace: FONT, fontSize: 13, color: C.slate }
  );

  // ---- Main diagram: three columns · people → app → outputs -----------------
  const topY = 2.0, topH = 3.7;

  // 1. The team (left)
  const p1x = 0.5, p1w = 3.05;
  card(s, { x: p1x, y: topY, w: p1w, h: topH, title: "THE TEAM", accent: C.iris });

  const people = [
    { role: "Admin", desc: "Runs the account · manages users", dot: C.iris },
    { role: "Manager", desc: "Owns the pipeline · assigns leads · reviews reports", dot: C.qu },
    { role: "Sales Rep", desc: "Works assigned leads · updates status · WhatsApps", dot: C.pr },
  ];
  people.forEach((p, i) => {
    const y = topY + 0.65 + i * 0.95;
    // Person "avatar"
    s.addShape(pptx.ShapeType.ellipse, {
      x: p1x + 0.2, y: y + 0.05, w: 0.42, h: 0.42,
      fill: { color: p.dot }, line: { type: "none" },
    });
    s.addText(p.role, {
      x: p1x + 0.72, y, w: p1w - 0.85, h: 0.3,
      fontFace: FONT, fontSize: 13, bold: true, color: C.ink,
    });
    s.addText(p.desc, {
      x: p1x + 0.72, y: y + 0.3, w: p1w - 0.85, h: 0.5,
      fontFace: FONT, fontSize: 9.5, color: C.slate, valign: "top",
    });
  });

  // 2. The Leadway app (centre) — the biggest, most prominent panel
  const p2x = p1x + p1w + 0.55;
  const p2w = 5.15;
  s.addShape(pptx.ShapeType.rect, {
    x: p2x, y: topY, w: p2w, h: topH, fill: { color: C.irisSoft },
    line: { color: C.iris, width: 1.5 }, rectRadius: 0.08,
  });
  s.addText("LEADWAY  ·  THE APP", {
    x: p2x + 0.22, y: topY + 0.16, w: p2w - 0.44, h: 0.36,
    fontFace: FONT, fontSize: 13, bold: true, color: C.iris, charSpacing: 1.5,
  });
  const appPoints = [
    { t: "Shows each person only what they should see", sub: "reps see their own leads · managers see the team" },
    { t: "Only allows the right next step in the pipeline", sub: "no skipping — one stage forward at a time" },
    { t: "Scores every lead automatically", sub: "budget, timeline, decision-maker — kept up to date" },
    { t: "Tells the team what needs attention today", sub: "overdue follow-ups, idle leads, hottest deals" },
  ];
  appPoints.forEach((pt, i) => {
    const y = topY + 0.7 + i * 0.7;
    s.addShape(pptx.ShapeType.ellipse, {
      x: p2x + 0.28, y: y + 0.08, w: 0.14, h: 0.14,
      fill: { color: C.iris }, line: { type: "none" },
    });
    s.addText(pt.t, {
      x: p2x + 0.55, y, w: p2w - 0.7, h: 0.3,
      fontFace: FONT, fontSize: 12, bold: true, color: C.ink,
    });
    s.addText(pt.sub, {
      x: p2x + 0.55, y: y + 0.3, w: p2w - 0.7, h: 0.28,
      fontFace: FONT, fontSize: 10, italic: true, color: C.slate,
    });
  });

  // 3. The two things the app produces (right): data · WhatsApp
  const p3x = p2x + p2w + 0.55;
  const p3w = 13.333 - p3x - 0.5;

  // Top-right — Safe records
  const trH = 1.75;
  card(s, { x: p3x, y: topY, w: p3w, h: trH, title: "SAFE RECORDS", accent: C.wn });
  s.addText("Every action is stored — who did what, when", {
    x: p3x + 0.2, y: topY + 0.6, w: p3w - 0.35, h: 0.35,
    fontFace: FONT, fontSize: 11, bold: true, color: C.ink,
  });
  s.addText(
    "The full history of each lead lives in one place — nothing is deleted, so audits and reports always add up.",
    { x: p3x + 0.2, y: topY + 0.95, w: p3w - 0.35, h: 0.75,
      fontFace: FONT, fontSize: 10, color: C.slate, valign: "top" }
  );

  // Bottom-right — WhatsApp
  const brY = topY + trH + 0.2;
  const brH = topH - trH - 0.2;
  card(s, { x: p3x, y: brY, w: p3w, h: brH, title: "WHATSAPP, IN ONE TAP", accent: C.qu });
  s.addText("Opens WhatsApp with the message ready to send", {
    x: p3x + 0.2, y: brY + 0.6, w: p3w - 0.35, h: 0.35,
    fontFace: FONT, fontSize: 11, bold: true, color: C.ink,
  });
  s.addText(
    "The lead's name and company drop in automatically. The team never copy-pastes phone numbers — and every contact is recorded in the history.",
    { x: p3x + 0.2, y: brY + 0.95, w: p3w - 0.35, h: 0.75,
      fontFace: FONT, fontSize: 10, color: C.slate, valign: "top" }
  );

  // ---- Flow arrows ----------------------------------------------------------
  // People → App (thick iris arrow)
  s.addShape(pptx.ShapeType.line, {
    x: p1x + p1w + 0.05, y: topY + topH / 2, w: 0.4, h: 0,
    line: { color: C.iris, width: 3, endArrowType: "triangle" },
  });
  // App → Records (top-right)
  s.addShape(pptx.ShapeType.line, {
    x: p2x + p2w + 0.05, y: topY + trH * 0.5, w: 0.4, h: 0,
    line: { color: C.iris, width: 2.5, endArrowType: "triangle" },
  });
  // App → WhatsApp (bottom-right)
  s.addShape(pptx.ShapeType.line, {
    x: p2x + p2w + 0.05, y: brY + brH * 0.5, w: 0.4, h: 0,
    line: { color: C.iris, width: 2.5, endArrowType: "triangle" },
  });

  // ---- Bottom band: three business-relevant benefits (no engineering) -------
  const bY = 6.05, bH = 1.0;
  const benefits = [
    {
      title: "Fast in the field",
      body: "Hosted in Singapore — quick to open on any phone or laptop with an internet connection.",
      accent: C.iris,
    },
    {
      title: "Nothing is lost",
      body: "Every change is recorded and dated. Later, reports build themselves from that record.",
      accent: C.wn,
    },
    {
      title: "Works with existing tools",
      body: "Uses WhatsApp the team already knows — no new app to learn, no new phone number to give customers.",
      accent: C.qu,
    },
  ];
  const bW = (12.33 - 0.4) / 3;
  benefits.forEach((b, i) => {
    const x = 0.5 + i * (bW + 0.2);
    card(s, { x, y: bY, w: bW, h: bH, title: b.title.toUpperCase(), accent: b.accent });
    s.addText(b.body, {
      x: x + 0.2, y: bY + 0.5, w: bW - 0.35, h: 0.5,
      fontFace: FONT, fontSize: 10, color: C.slate, valign: "top",
    });
  });
}

// ---------------------------------------------------------------------------
// Slide 3 · Project structure
// ---------------------------------------------------------------------------
function slideStructure() {
  const s = baseSlide(
    "Project structure",
    "SLIDE  ·  SYSTEM DESIGN"
  );
  s.addText(
    "Next.js App Router · route groups keep the auth shell separate from public pages",
    { x: 0.5, y: 1.35, w: 12.33, h: 0.3, fontFace: FONT, fontSize: 12, color: C.slate }
  );

  // Left column: folder tree (monospace-feeling, tight leading)
  const treeX = 0.5, treeY = 1.85, treeW = 6.2, treeH = 5.3;
  card(s, { x: treeX, y: treeY, w: treeW, h: treeH, title: "REPOSITORY" });

  const tree = [
    ["leadway/", "root", 0, false],
    ["app/", "routes + pages (App Router)", 1, true],
    ["(app)/", "auth-required shell (layout guard)", 2, true],
    ["dashboard/", "role-scoped KPIs + attention queue", 3, true],
    ["leads/", "list, detail [id], actions", 3, true],
    ["reports/", "Manager/Admin analytics (§14.6)", 3, true],
    ["templates/", "WhatsApp templates CRUD (§14.9)", 3, true],
    ["users/", "Admin user management", 3, true],
    ["login/", "public login page + action", 2, false],
    ["components/", "React components (dialogs, panels)", 1, false],
    ["lib/", "PURE business modules (tested)", 1, true],
    ["auth.ts", "session + requireUser guard", 2, false],
    ["permissions.ts", "can(user, action, lead?)", 2, false],
    ["transitions.ts", "funnel rule", 2, false],
    ["scoring.ts", "fit score + temperature (§14.2)", 2, true],
    ["velocity.ts", "stage days + conversion (§14.5)", 2, true],
    ["whatsapp.ts", "phone, wa.me, template roles", 2, false],
    ["prisma/", "schema + seed", 1, false],
    ["schema.prisma", "SQLite (dev / offline demo)", 2, false],
    ["schema.postgres.prisma", "Postgres (prod, Neon)", 2, false],
    ["seed.ts", "4 users · 16 leads · 14 templates", 2, false],
    ["tests/", "Vitest — 64 tests, five files", 1, false],
    ["docs/", "ADRs · user manual · ai-log", 1, false],
  ];

  const lineH = 0.21;
  tree.forEach(([name, desc, depth, highlight], i) => {
    const y = treeY + 0.6 + i * lineH;
    const px = treeX + 0.2 + depth * 0.35;
    if (highlight) {
      s.addShape(pptx.ShapeType.rect, {
        x: treeX + 0.08, y: y - 0.02, w: treeW - 0.16, h: lineH,
        fill: { color: C.irisSoft }, line: { type: "none" }, rectRadius: 0.03,
      });
    }
    s.addText(name, {
      x: px, y, w: 2.4, h: lineH,
      fontFace: "Consolas", fontSize: 10.5,
      bold: name.endsWith("/") || highlight,
      color: highlight ? C.iris : (name.endsWith("/") ? C.ink : C.ink),
    });
    s.addText(desc, {
      x: px + 2.4, y, w: treeW - (px - treeX) - 2.5, h: lineH,
      fontFace: FONT, fontSize: 9.5, italic: true, color: C.slate,
    });
  });

  // Right column · three principles as small cards
  const rightX = 6.95, rightW = 5.88;
  const pcards = [
    {
      title: "1 · Rules live in pure lib modules",
      body: "permissions, transitions, whatsapp, scoring, velocity have zero framework imports — they take primitives and return primitives, so Vitest runs them in ~13 ms across 64 assertions. When a rule changes, the module and its test change together (project convention).",
      accent: C.qu,
    },
    {
      title: "2 · Every mutation is a server action",
      body: "createLead, changeLeadStatus, setFollowUp, addCustomSource, createTemplate all rerun session + can() + rule checks server-side, then write an Activity row before revalidatePath. The UI is never the security boundary.",
      accent: C.pr,
    },
    {
      title: "3 · Audit trail is the analytics source",
      body: "Every STATUS_CHANGE is a timestamped Activity row. lib/velocity.ts reconstructs each lead's stage history from those rows — no extra tracking. The Reports screen's velocity strip, sales cycle, and monthly outcomes are all derived from it.",
      accent: C.iris,
    },
  ];

  const pcH = 1.66;
  pcards.forEach((p, i) => {
    const y = treeY + i * (pcH + 0.16);
    card(s, { x: rightX, y, w: rightW, h: pcH, title: p.title, accent: p.accent });
    s.addText(p.body, {
      x: rightX + 0.22, y: y + 0.55, w: rightW - 0.44, h: pcH - 0.65,
      fontFace: FONT, fontSize: 10, color: C.slate, valign: "top",
    });
  });
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
slideERD();
slideArchitecture();
slideStructure();

const outPath = path.join(__dirname, "..", "presentation", "XeersLead-architecture-slides.pptx");
pptx.writeFile({ fileName: outPath }).then(() => {
  console.log(`Wrote ${outPath}`);
});
