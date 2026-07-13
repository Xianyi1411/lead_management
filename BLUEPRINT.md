# Lead Management — Build Blueprint

This is the single source of truth for building the AI Lead Management Challenge
submission. It captures every design decision so the project can be built (by a
person or an AI assistant) without re-deriving anything. Read this first, then
[CONTEXT.md](CONTEXT.md) for the domain glossary and `docs/adr/` for the two
architecture decision records.

> **Scope note:** AI features (AI-generated messages, lead scoring, follow-up
> recommendations) were deliberately **cut from the application** — they require
> a paid Anthropic API key that the Claude Pro subscription does not cover. The
> "AI usage" scored by the competition is demonstrated through the *development
> process* (this blueprint, the glossary, the ADRs, and `docs/ai-log.md`), not
> through in-app AI calls.

---

## 1. Objective & scoring

Build a Lead Management web application for a competition judged on how well AI
is used across the software lifecycle. Presentation is the Tuesday after the
brief. Marks:

| Criterion | Marks | Where it's covered |
|---|---|---|
| Working Application | 30 | Section 4 (feature list) |
| System Design | 20 | Sections 5–8 (architecture, ERD, workflow, folders) + ADRs |
| AI Prompt Engineering | 20 | This file + glossary + ADRs + `docs/ai-log.md` |
| Software Quality & Documentation | 20 | Section 9 (business logic, risk, tests, manual) |
| Presentation & Demo | 10 | Section 11 (demo script) |
| **Bonus (innovative AI)** | +10 | Not attempted — see scope note above |

---

## 2. Tech stack (see ADR-0001)

- **Framework:** Next.js (full-stack — React UI + API route handlers in one codebase)
- **ORM:** Prisma
- **Database:** PostgreSQL (Neon free tier in production; local Postgres or SQLite for dev)
- **Auth:** email + password with hashed passwords and role-based sessions
- **Hosting:** Vercel (public URL for judges); local `npm run dev` is the demo fallback
- **Testing:** Vitest (unit tests on pure business-logic functions)
- **Styling:** Tailwind CSS; visual direction locked in [DESIGN.md](DESIGN.md) (tokens, components, motion) with a clickable reference at `design/mockup.html`

---

## 3. Roles & permissions

Three roles. "Own leads" = leads where `assignedToId` equals the user.

| Capability | Admin | Manager | Sales Rep |
|---|:---:|:---:|:---:|
| Log in | ✅ | ✅ | ✅ |
| Manage users (create, deactivate, set role) | ✅ | ❌ | ❌ |
| View all leads | ✅ | ✅ | ❌ (own only) |
| Create lead | ✅ | ✅ | ✅ |
| Edit lead | ✅ | ✅ | ✅ (own only) |
| Delete lead | ✅ | ✅ | ❌ |
| Assign lead to a rep | ✅ | ✅ | ❌ |
| Change status (per transition rule) | ✅ | ✅ | ✅ (own only) |
| Reopen a Won/Lost lead | ✅ | ✅ | ❌ |
| WhatsApp contact + log activity | ✅ | ✅ | ✅ (own only) |
| Dashboard scope | system-wide | team-wide | personal |

Rationale (a Risk-Management talking point): Reps can create leads (they meet
prospects in the field) but cannot delete (deletion destroys audit history) or
assign (assignment is a management decision).

---

## 4. Required features (the 30-mark checklist) — **all shipped**

- [x] **User login & role management** — login page; Admin-only Users page to create/deactivate users and set roles. No public sign-up.
- [x] **Lead CRUD** — add / edit / delete / view, gated by the permission matrix.
- [x] **Lead assignment** — Manager/Admin assign a lead to one Sales Rep.
- [x] **Lead status tracking** — the 6-stage funnel with enforced transitions (Section 9).
- [x] **Dashboard** — role-scoped KPI cards, funnel chart, source breakdown, recent-activity feed.
- [x] **Search & filter** — text search on name/phone/company; filters by status, source, assigned rep.
- [x] **Contact via WhatsApp** — pick a template, edit preview, open `wa.me`, log the activity (see ADR-0002).
- [x] **Activity log** — full per-lead timeline: WhatsApp contacts, status changes, assignments, notes, creation.

Phase 2 additions (§14, all shipped) are covered separately below.

---

## 5. System architecture

```
Browser (React pages)
   │  HTTPS
   ▼
Next.js on Vercel (functions pinned to sin1, same region as Neon)
   ├─ Server Components / pages (app/)
   ├─ Server Actions (app/(app)/*/actions.ts)  ── auth check + permission check
   │                                             + Activity row + revalidatePath
   └─ lib/ business logic (pure, unit-tested modules — §8 tree)
   │  Prisma Client
   ▼
PostgreSQL (Neon)  — Users, Leads, Activities
```

External: the WhatsApp button builds a `wa.me` deep link that opens WhatsApp
Web/App in a new tab. No server-to-WhatsApp integration exists (see ADR-0002).

---

## 6. Database ERD

Three tables plus enums. Prisma schema is the authoritative source; keep this
diagram in sync with `prisma/schema.prisma`.

```
User                          Lead                              Activity
────                          ────                              ────────
id            PK              id              PK                id          PK
name                          name                             leadId      FK → Lead
email  (unique)               phone                            userId      FK → User
passwordHash                  email                            type        (enum)
role   (enum)                 company                          detail      (text)
isActive                      source          (enum)           createdAt
createdAt                     status          (enum, default New)
                              dealValue       (decimal, RM)
                              notes
                              budgetStatus    (enum, default Unknown)   ← §14
                              authority       (enum, default Unknown)   ← §14
                              timeline        (enum, default Unknown)   ← §14
                              nextFollowUpAt  (datetime, nullable)      ← §14
                              lostReason      (enum, nullable)          ← §14
                              assignedToId    FK → User (nullable)
                              createdById     FK → User
                              createdAt / updatedAt

Relationships:
  User 1───* Lead      (assignedTo:  a rep owns many leads)
  User 1───* Lead      (createdBy:   who added the lead)
  User 1───* Activity  (who performed the action)
  Lead 1───* Activity  (a lead's timeline)

CustomSource (§14.7): id PK · name (unique) · createdAt — team-added sources;
Lead.source stores a built-in code or a CustomSource name (validated in the
server actions, no FK so the six built-ins need no rows).

MessageTemplate (§14.9): id PK · label (unique) · body · roles (CSV of Role) ·
createdAt / updatedAt — editable WhatsApp templates; the roles column decides
which users may send each one.

Lead also carries §14.8's exact figures: budgetAmount (Int?, RM) and
expectedCloseAt (DateTime?).
```

**Enums**

- `Role`: `ADMIN | MANAGER | SALES_REP`
- `LeadStatus`: `NEW | CONTACTED | QUALIFIED | PROPOSAL | WON | LOST`
- `LeadSource`: `WEBSITE | REFERRAL | WALK_IN | SOCIAL_MEDIA | EVENT | OTHER`
- `ActivityType`: `WHATSAPP_CONTACT | STATUS_CHANGE | ASSIGNMENT | NOTE | CREATED | FOLLOW_UP`
- `BudgetStatus`: `CONFIRMED | LIKELY | UNKNOWN | NONE` (§14)
- `Authority`: `DECISION_MAKER | INFLUENCER | UNKNOWN` (§14)
- `Timeline`: `IMMEDIATE | THIS_QUARTER | THIS_YEAR | UNKNOWN` (§14)
- `LostReason`: `PRICE | COMPETITOR | NO_RESPONSE | NOT_INTERESTED | BAD_FIT | OTHER` (§14)

---

## 7. Application workflow (life of a lead)

```
Lead captured (Status = New, unassigned)
        │
Manager/Admin assigns to a Sales Rep
        │
Rep works the lead ──► WhatsApp contact (logs Activity)
        │
Status advances one step at a time:
   New → Contacted → Qualified → Proposal → Won
        │
   (any active status) ─────────────────────► Lost
        │
Won / Lost are terminal (frozen); Manager/Admin may reopen
```

Every meaningful action writes an Activity row, forming the audit trail shown on
the lead detail page.

---

## 8. Folder / project structure

```
lead_management/
├── app/
│   ├── login/                 login page (public) + login action
│   └── (app)/                 auth-required shell (Rail + Topbar + layout guard)
│       ├── dashboard/         role-scoped: KPIs, spectrum, velocity, needs-attention
│       ├── leads/             list + Focus filter
│       │   ├── [id]/          detail: info · qualification · funnel · WhatsApp · timeline
│       │   └── actions.ts     server actions (mutations re-check server-side)
│       ├── reports/           Manager/Admin analytics (§14.6)
│       ├── templates/         Manager/Admin WhatsApp templates (§14.9)
│       └── users/             Admin-only user management
├── lib/                       pure, unit-tested business modules — never import
│   ├── auth.ts                session + password hashing + requireUser guard
│   ├── permissions.ts         can(user, action, lead?)
│   ├── transitions.ts         allowedTransitions + canTransition + reopenTarget
│   ├── whatsapp.ts            phone normalise · wa.me link · template roles
│   ├── scoring.ts             fit score + temperature (§14.2, ADR-0003)
│   ├── velocity.ts            time-in-stage · conversion · sales cycle (§14.5)
│   ├── domain.ts              enums + labels + type guards
│   └── status-ui.ts           stage colour spectrum + temperature spectrum
├── prisma/
│   ├── schema.prisma          SQLite (dev) — source of truth for the ERD
│   ├── schema.postgres.prisma Postgres (prod) — model-identical to the above
│   └── seed.ts                demo users · leads · custom source · 14 templates
├── tests/
│   ├── transitions.test.ts
│   ├── permissions.test.ts
│   ├── whatsapp.test.ts
│   ├── scoring.test.ts        (§14.2)
│   └── velocity.test.ts       (§14.5)
├── docs/
│   ├── adr/                   0001, 0002, 0003 (+ future)
│   ├── ai-log.md              key AI prompts & outcomes (numbered; newest last)
│   ├── deploy.md              Vercel + Neon runbook
│   └── user-manual.md         per-role how-to (covers §4 core + §14 Phase 2)
├── components/                React components (dialogs, panels, controls)
├── presentation/              pitch deck (main + architecture supplement)
├── scripts/                   build-time helpers (e.g. deck generator)
├── CONTEXT.md                 domain glossary
├── HANDOFF.md                 next-session pickup notes
└── BLUEPRINT.md               this file
```

---

## 9. Software quality

### Business logic (five pure, unit-tested modules)

**Status transition rule** (`lib/transitions.ts`):

```
New       → Contacted, Lost
Contacted → Qualified, Lost
Qualified → Proposal,  Lost
Proposal  → Won,       Lost
Won       → (frozen; reopen to Proposal by Manager/Admin only)
Lost      → (frozen; reopen to prior status by Manager/Admin only)
```

Only forward-by-one is allowed; Lost is reachable from any active status;
terminals are frozen except for Manager/Admin reopen. Attempting any other jump
is rejected.

**Permission rule** (`lib/permissions.ts`): implements Section 3 as a pure
`can(user, action, lead?)` function.

**WhatsApp link builder** (`lib/whatsapp.ts`): `buildWaLink(phone, message)`
normalises the phone (strip spaces/`+`, country code) and returns
`https://wa.me/<phone>?text=<encoded>`; `fillTemplate(template, {leadName,
company, repName})` substitutes placeholders; `parseTemplateRoles` +
`templateAllowedFor` enforce the §14.9 per-role gate; `invalidPlaceholders`
rejects unknown `{tokens}` at template save time.

**Fit scoring** (`lib/scoring.ts`, §14.2, ADR-0003): `qualificationScore` sums
weighted points from budget (0–30, adjusted by `budgetAmount` coverage),
authority (0–25), timeline (0–25, date-derived when `expectedCloseAt` is set
via `timelineFromDate`), source (0–10), deal size (0–10); `qualificationVerdict`
maps 0–100 → Nurture / Review / Qualify. `temperatureScore` combines fit +
funnel depth − inactivity − overdue-follow-up penalty for the Hot/Warm/Cold
work-priority signal.

**Velocity analytics** (`lib/velocity.ts`, §14.5): reconstructs each lead's
stage history from STATUS_CHANGE Activity rows (`parseTransition`,
`stageHistory`), then derives `avgDaysInStage`, `stageConversion`, and
`avgSalesCycleDays`. No extra tracking — the audit trail is the source.

### Risk management (talking points)

- **WhatsApp logs intent, not delivery** (ADR-0002) — mitigation: upgrade path to the WhatsApp Business API for delivery receipts.
- **No hard delete of history** — deletion is restricted; the activity log preserves the audit trail.
- **Role-based access enforced server-side** in every server action, not just hidden in the UI. Page-level auth uses `requireUser()` (`lib/auth.ts`) — App Router renders layout and page in parallel, so a stale session cookie will crash a page that assumes a non-null user; `requireUser()` redirects to `/login` instead.
- **Secrets in environment variables** (DB URL, session secret) — never committed.
- **Demo resilience** — deployed on Vercel with a local `npm run dev` fallback if conference Wi-Fi fails.

### Unit testing

Vitest against the five pure modules above — transitions, permissions,
whatsapp, scoring, velocity. **64 tests, ~500 ms**, deterministic and fast,
giving meaningful coverage of the core business rules without brittle UI
tests. If a rule changes, change the module + its test together (project
convention).

### User manual

`docs/user-manual.md` — per-role walkthroughs (log in, add a lead, assign,
change status, WhatsApp a lead, read the dashboard), written in the vocabulary
defined in CONTEXT.md.

---

## 10. WhatsApp message templates

The original spec (three fixed templates) is now the **built-in seed** for the
editable, role-scoped `MessageTemplate` table (Blueprint §14.9). Manager/Admin
manage them on `/templates`; each row declares which roles can send it. The
three seeded built-ins are:

- **Introduction:** `Hi {leadName}, this is {repName}. Thanks for your interest — I'd love to help {company} with … Are you free for a quick chat?`
- **Follow-up:** `Hi {leadName}, following up on our earlier conversation. Do you have any questions I can help with?`
- **Proposal follow-up:** `Hi {leadName}, just checking in on the proposal we sent {company}. Happy to walk you through it whenever suits you.`

Clicking a template logs a `WHATSAPP_CONTACT` activity (recording which template
was used) at click time.

---

## 11. Presentation (15 minutes)

Cover: solution overview, system architecture, AI usage, live demo, lessons learned.

**Demo script:**

1. Log in as **Manager** → dashboard (team-wide KPIs, funnel).
2. Create a new lead, then assign it to a Sales Rep.
3. Log in as that **Sales Rep** (second browser window) → sees only their leads.
4. Open the lead → **Contact via WhatsApp**, pick the Introduction template, show the pre-filled preview, open WhatsApp.
5. Advance status New → Contacted → Qualified, show the transition rule blocking an illegal jump.
6. Show the **activity timeline** filling up, and the dashboard numbers moving.
7. **AI usage:** show this blueprint, CONTEXT.md, and the ADRs as evidence of an AI-led design process; show `docs/ai-log.md` for coding/debug/UI prompts.

---

## 12. Suggested schedule (historical, kept for provenance)

The original four-day build plan; §4 core shipped inside it, §14 Phase 2 was
added later.

- **Day 1 (Sat):** scaffold Next.js + Prisma; schema + seed; auth + roles; lead CRUD.
- **Day 2 (Sun):** assignment; transition rules; WhatsApp feature + activity log; server-side permissions everywhere.
- **Day 3 (Mon):** dashboard + search/filter; UI polish; unit tests; deploy to Vercel; generate docs.
- **Day 4 (Tue):** slides; rehearse the demo; verify the local fallback.
- **Post-deploy:** the Phase 2 items in §14 landed in a second wave of work.

---

## 13. Seed data (for the demo)

- **Users:** 1 Admin, 1 Manager, 2 Sales Reps (known passwords, documented in the user manual).
- **Leads:** 16 across every status and source, some assigned, with varied deal values, qualification facts, `budgetAmount`/`expectedCloseAt` where relevant, follow-up dates (some overdue for the needs-attention demo), and lost reasons. Timelines are spread over ~10 weeks with day-scale gaps so the §14 analytics (velocity, cycle, monthly outcomes, forecast) read as real history.
- **Activities:** a few per lead so timelines aren't empty.
- **Custom sources:** one team-added source (`Google Ads`) so the extensible-source flow (§14.7) demos populated.
- **WhatsApp templates:** 14 covering the lifecycle (intro, follow-up, proposal follow-up, meeting request, quotation sent, demo invitation, reconnect, event, thank you, renewal, referral, price discussion, discount approval, payment reminder). The last three are Manager/Admin-only so the role gate demos visibly (§14.9).

---

## 14. Phase 2 — qualification gate & analytics (post-deploy upgrade)

Built after the §4 checklist shipped; same conventions (server-side enforcement,
pure tested `lib/` modules, Activity audit rows). Detail: ADR-0003 and the
"Qualification & scoring" / "Reporting" sections of CONTEXT.md.

1. **Qualification gate at intake.** The Add-lead dialog captures three
   BANT-style facts (budget, contact's authority, purchase timeline) and shows a
   **live fit score (0–100)** with a verdict — Strong / Medium / Low fit — and
   plain-language guidance, so the team decides whether a lead is worth adding
   *before* spending outreach time. The score is advisory, never blocking; the
   CREATED activity records the score at intake for later backtesting.
2. **Rule-based scoring engine** (`lib/scoring.ts`, pure + tested): fit score
   from qualification + source + deal band; **temperature** (Hot / Warm / Cold)
   on active leads from fit + funnel depth − inactivity − overdue follow-up.
   Explainable by design; swaps for a trained model behind the same function
   once enough win/loss history accumulates (ADR-0003).
3. **Follow-up scheduling.** `nextFollowUpAt` per lead, set from the detail
   page; overdue/due-today/idle leads surface in the dashboard's
   **Needs-attention queue** and the leads table's **Focus** filter.
4. **Lost reasons.** Marking Lost requires a reason (fixed list) — recorded on
   the lead and in the activity detail, feeding the win/loss report.
5. **Pipeline velocity** (`lib/velocity.ts`, pure + tested): reconstructs each
   lead's stage history from STATUS_CHANGE activities — avg days per stage,
   stage→stage conversion, avg sales cycle. Dashboard shows it as the Velocity
   strip. The audit trail doubles as the analytics source; no extra tracking.
6. **Reports screen** (Manager/Admin, `view_reports` permission): per-rep
   performance (open leads, pipeline RM, won RM, win rate, first-response time
   from assignment → first touch), lost-reason breakdown, won value by source,
   and monthly Won/Lost outcomes dated by the transition activity.
7. **Extensible sources.** The six built-in sources are no longer a closed
   list: "+ Add a new source" in the Add/Edit lead dialogs registers a custom
   source in a new `CustomSource` table (name-unique, deduped against built-ins
   case-insensitively) so the whole team can pick it — never free text on the
   lead, so analytics stay grouped. `Lead.source` stores a built-in code or a
   custom name; validity is re-checked server-side against both. Custom sources
   flow through the source filter, dashboard breakdown, and won-value-by-source
   report, and score a neutral 5/10 in the fit rule until the win/loss data
   says otherwise.
8. **Exact figures behind the bands.** Optional `budgetAmount` (the customer's
   stated budget, RM) and `expectedCloseAt` (expected purchase date) sit behind
   the qualification bands. The bands stay for when reps genuinely don't know —
   forcing precision at intake produces fake data — but exact figures win when
   captured: a budget covering the deal is +5 fit points (under half = −5), and
   a date *replaces* the hand-picked timeline entirely (`timelineFromDate`:
   ≤31d Immediate, ≤92d This quarter, ≤366d This year). The stored `timeline`
   is always the effective one. Payoff: the Reports screen gains a **Pipeline
   forecast** — active-lead RM by expected close month (+ Later / No date).
9. **Editable, role-scoped WhatsApp templates.** Templates moved from a code
   constant into a `MessageTemplate` table (label unique, body, roles CSV).
   Managers/Admins manage them on **/templates** (`manage_templates`
   permission): create, edit, delete, with placeholder validation (only
   `{leadName} {company} {repName}`; typos are rejected before they reach a
   customer) and per-role availability checkboxes. The lead page's WhatsApp
   panel shows each user only their role's templates; `logWhatsAppContact`
   re-checks the role server-side. Deleting a template never rewrites past
   activities — the timeline stores the label as text.
