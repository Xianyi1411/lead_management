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
// Slide 2 · System architecture
// ---------------------------------------------------------------------------
function slideArchitecture() {
  const s = baseSlide(
    "System architecture",
    "SLIDE  ·  SYSTEM DESIGN"
  );
  s.addText(
    "Next.js full-stack on Vercel · Prisma over PostgreSQL (Neon) · WhatsApp click-to-chat (ADR-0002)",
    { x: 0.5, y: 1.35, w: 12.33, h: 0.3, fontFace: FONT, fontSize: 12, color: C.slate }
  );

  // Row layout: Client → Edge/Server → Data · with an external WhatsApp column.
  const rowY = 2.0, rowH = 3.9;
  const gap = 0.35;
  const boxW = 2.9;

  // ---- 1. Client ----
  const c1x = 0.5;
  card(s, { x: c1x, y: rowY, w: boxW, h: rowH, title: "CLIENT (BROWSER)", accent: C.ct });
  const clientLines = [
    { t: "React server components", sub: "role-scoped dashboard, leads, reports" },
    { t: "Client components", sub: "dialogs, dropdowns, motion" },
    { t: "Custom Dropdown, Modal", sub: "no native selects app-wide" },
    { t: "Motion layer", sub: "count-up, funnel wipe, pill flush" },
    { t: "HTTPS / cookies", sub: "session token (HttpOnly, SameSite=lax)" },
  ];
  clientLines.forEach((l, i) => {
    const y = rowY + 0.62 + i * 0.6;
    s.addShape(pptx.ShapeType.ellipse, {
      x: c1x + 0.18, y: y + 0.06, w: 0.11, h: 0.11,
      fill: { color: C.iris }, line: { type: "none" },
    });
    s.addText(l.t, { x: c1x + 0.38, y, w: boxW - 0.5, h: 0.28,
      fontFace: FONT, fontSize: 11, bold: true, color: C.ink });
    s.addText(l.sub, { x: c1x + 0.38, y: y + 0.28, w: boxW - 0.5, h: 0.28,
      fontFace: FONT, fontSize: 9.5, italic: true, color: C.slate });
  });

  // ---- 2. Server (Next.js on Vercel, pinned sin1) ----
  const c2x = c1x + boxW + gap;
  card(s, { x: c2x, y: rowY, w: boxW, h: rowH, title: "NEXT.JS · VERCEL sin1", accent: C.qu });
  const serverLines = [
    { t: "Middleware", sub: "auth gate — verifies session cookie" },
    { t: "Server actions", sub: "recheck can() + transition rule" },
    { t: "lib/permissions.ts", sub: "pure, unit-tested (14 tests)" },
    { t: "lib/transitions.ts", sub: "one-step-forward funnel rule" },
    { t: "lib/scoring.ts", sub: "fit score, temperature (ADR-0003)" },
    { t: "lib/velocity.ts", sub: "time-in-stage, conversion, cycle" },
    { t: "lib/whatsapp.ts", sub: "phone normalise, wa.me link, roles" },
  ];
  serverLines.forEach((l, i) => {
    const y = rowY + 0.62 + i * 0.44;
    s.addShape(pptx.ShapeType.ellipse, {
      x: c2x + 0.18, y: y + 0.05, w: 0.11, h: 0.11,
      fill: { color: C.iris }, line: { type: "none" },
    });
    s.addText(l.t, { x: c2x + 0.38, y, w: boxW - 0.5, h: 0.24,
      fontFace: FONT, fontSize: 10.5, bold: true, color: C.ink });
    s.addText(l.sub, { x: c2x + 0.38, y: y + 0.22, w: boxW - 0.5, h: 0.22,
      fontFace: FONT, fontSize: 9, italic: true, color: C.slate });
  });

  // ---- 3. Data ----
  const c3x = c2x + boxW + gap;
  card(s, { x: c3x, y: rowY, w: boxW, h: rowH, title: "PRISMA + POSTGRES (NEON sin1)", accent: C.pr });
  const dataLines = [
    { t: "User · Lead · Activity", sub: "core entities (Blueprint §6)" },
    { t: "CustomSource", sub: "team-added sources (§14.7)" },
    { t: "MessageTemplate", sub: "editable WA templates (§14.9)" },
    { t: "Dual Prisma schemas", sub: "SQLite dev · Postgres prod" },
    { t: "vercel-build script", sub: "generate + db push + next build" },
    { t: "Neon Singapore direct URL", sub: "same region as fns (latency fix)" },
  ];
  dataLines.forEach((l, i) => {
    const y = rowY + 0.62 + i * 0.5;
    s.addShape(pptx.ShapeType.ellipse, {
      x: c3x + 0.18, y: y + 0.05, w: 0.11, h: 0.11,
      fill: { color: C.iris }, line: { type: "none" },
    });
    s.addText(l.t, { x: c3x + 0.38, y, w: boxW - 0.5, h: 0.26,
      fontFace: FONT, fontSize: 11, bold: true, color: C.ink });
    s.addText(l.sub, { x: c3x + 0.38, y: y + 0.24, w: boxW - 0.5, h: 0.24,
      fontFace: FONT, fontSize: 9.5, italic: true, color: C.slate });
  });

  // ---- 4. External · WhatsApp (right column) ----
  const c4x = c3x + boxW + gap;
  const c4w = 13.333 - c4x - 0.5;
  card(s, { x: c4x, y: rowY, w: c4w, h: rowH, title: "EXTERNAL", accent: C.wn });
  s.addText("wa.me deep link", {
    x: c4x + 0.18, y: rowY + 0.65, w: c4w - 0.3, h: 0.3,
    fontFace: FONT, fontSize: 12, bold: true, color: C.ink,
  });
  s.addText(
    "Server builds https://wa.me/<phone>?text=<msg>; the client opens it in a new tab. WhatsApp itself handles delivery — the app logs INTENT (a WHATSAPP_CONTACT activity), not proof of delivery. ADR-0002 documents the upgrade path to the WhatsApp Business Cloud API for delivery receipts.",
    { x: c4x + 0.18, y: rowY + 1.0, w: c4w - 0.3, h: 2.8,
      fontFace: FONT, fontSize: 9.5, color: C.slate, valign: "top" }
  );

  // ---- Flow arrows between the three inline columns ----
  const arrY = rowY + rowH * 0.5;
  s.addShape(pptx.ShapeType.line, {
    x: c1x + boxW, y: arrY, w: gap, h: 0,
    line: { color: C.slate, width: 1.5, endArrowType: "triangle" },
  });
  s.addShape(pptx.ShapeType.line, {
    x: c2x + boxW, y: arrY, w: gap, h: 0,
    line: { color: C.slate, width: 1.5, endArrowType: "triangle" },
  });

  // ---- Bottom band: verification story ----
  const bY = 6.1;
  s.addShape(pptx.ShapeType.rect, {
    x: 0.5, y: bY, w: 12.33, h: 0.85,
    fill: { color: C.irisSoft }, line: { type: "none" }, rectRadius: 0.06,
  });
  s.addText("Verification lap  ·  every commit that touches app code", {
    x: 0.7, y: bY + 0.08, w: 12, h: 0.28,
    fontFace: FONT, fontSize: 10.5, bold: true, color: C.iris, charSpacing: 1,
  });
  s.addText(
    "npm test   →  64 unit tests, pure lib modules       npx tsc --noEmit   →  strict type-check clean       npm run build   →  Next.js production build clean",
    { x: 0.7, y: bY + 0.38, w: 12, h: 0.4,
      fontFace: FONT, fontSize: 10, color: C.ink, valign: "top" }
  );
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
